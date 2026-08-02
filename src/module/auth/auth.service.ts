import { getDatabaseUniqueConflictTarget, isDatabaseErrorCode, PrismaKnownErrorCode } from '@/filters/database-error';
import type { User } from '@/generated/prisma/client';
import { ResponseResult } from '@/interceptors/transform.interceptor';
import { PrismaService } from '@/module/prisma/prisma.service';
import { normalizeIp } from '@/utils/ip';
import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Cron, CronExpression } from '@nestjs/schedule';
import { compare, hash } from 'bcrypt';
import { I18nService } from 'nestjs-i18n';
import { createHash, randomUUID } from 'node:crypto';
import { catchError, defer, forkJoin, from, map, Observable, of, switchMap, throwError } from 'rxjs';
import { authJwtConfig } from '../../config/jwt.config';
import type { AuthTokenClaims, AuthTokens, AuthUserClaims, SessionMetadata } from './auth.types';
import type { ChangePasswordDto } from './dto/change-password.dto';
import type { RegisterDto } from './dto/register.dto';

const BCRYPT_SALT_ROUNDS = 10;
// 每个用户允许的最大活跃会话数，登录超出时按最近使用时间淘汰最旧的会话，防止反复登录（或恶意刷登录接口）导致会话无限积累
const MAX_ACTIVE_SESSIONS_PER_USER = 10;
// 已撤销会话的保留天数，保留期内的记录可用于安全审计追溯，到期后由定时任务物理删除
const REVOKED_SESSION_RETENTION_DAYS = 30;
// 预生成的 bcrypt 哈希（内容无意义）：用户不存在时也执行一次比较，抹平响应时间差，防止通过时序攻击枚举有效用户名
const DUMMY_PASSWORD_HASH = '$2b$10$HzSVIcSLwyaq4gLI8FXUJOKiHLE8wngJoq802/.MUH50LdoKfDB0y';
// 触发账户锁定的连续登录失败次数
const MAX_FAILED_LOGIN_ATTEMPTS = 5;
// 账户锁定时长（分钟），锁定到期后自动解锁并重新计数
const ACCOUNT_LOCK_MINUTES = 15;
const getRefreshTokenAudience = (accessTokenAudience: string) => `${accessTokenAudience}:refresh`;
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    @Inject(authJwtConfig.KEY)
    private readonly jwtConfiguration: ConfigType<typeof authJwtConfig>,
    private readonly prismaService: PrismaService,
    private readonly i18nService: I18nService,
  ) {}

  async validateUser(username: string, password: string) {
    const user = await this.prismaService.user.findUnique({ where: { username } });
    if (!user) {
      // 用户不存在时也执行一次比较，抹平响应时间差，防止时序攻击枚举用户名
      await compare(password, DUMMY_PASSWORD_HASH);
      return null;
    }

    const passwordMatches = await this.verifyPasswordWithLockout(user, password);
    return passwordMatches ? user : null;
  }

  /**
   * 校验密码并维护账户锁定状态（登录和修改密码共用）：
   * 锁定期内直接拒绝（到期自动解锁）；密码错误累计失败次数，达到上限锁定账户并清零计数；密码正确重置计数
   */
  private async verifyPasswordWithLockout(user: User, password: string): Promise<boolean> {
    // 账户锁定期内直接拒绝登录
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60_000);
      throw new ForbiddenException(this.i18nService.t('auth.ACCOUNT_LOCKED', { args: { minutes } }));
    }

    const passwordMatches = await compare(password, user.password);

    if (!passwordMatches) {
      // 用数据库原子自增（increment）累计失败次数，而不是"读取 +1 再写回"：
      // 后者在并发失败请求下会互相覆盖丢失计数，让攻击者获得多余的尝试机会
      const { failedLoginAttempts } = await this.prismaService.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: { increment: 1 } },
        select: { failedLoginAttempts: true },
      });

      // 以自增后的返回值判断是否触发锁定，保证并发下也只会有一个请求看到恰好达到上限的值；
      // 锁定时清零计数，解锁后重新开始累计
      if (failedLoginAttempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
        await this.prismaService.user.update({
          where: { id: user.id },
          data: { failedLoginAttempts: 0, lockedUntil: new Date(Date.now() + ACCOUNT_LOCK_MINUTES * 60_000) },
        });
      }
      return false;
    }

    // 校验成功，重置失败计数和历史锁定标记
    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      await this.prismaService.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });
    }
    return true;
  }

  isInitialized() {
    return from(this.prismaService.user.findFirst({ select: { id: true } })).pipe(map((user) => !!user));
  }

  login(user: User, metadata: SessionMetadata) {
    return this.createSessionAndIssueTokens(user, metadata);
  }

  initialize({ username, password, email }: RegisterDto, metadata: SessionMetadata) {
    // 如果系统已经初始化，则禁止重复初始化
    const alreadyInitializedMessage = this.i18nService.t('auth.SYSTEM_ALREADY_INITIALIZED');
    const createUser$ = defer(() => hash(password, BCRYPT_SALT_ROUNDS)).pipe(
      switchMap((passwordHash) =>
        from(
          this.prismaService.$transaction(
            async (transaction) => {
              if ((await transaction.user.findFirst({ select: { id: true } })) !== null) {
                throw new ConflictException(alreadyInitializedMessage);
              }
              return transaction.user.create({
                data: { username, password: passwordHash, email, role: 'ADMIN' },
                select: { id: true, username: true, role: true },
              });
            },
            { isolationLevel: 'Serializable' },
          ),
        ),
      ),
      catchError((error: unknown) => {
        if (
          error instanceof ConflictException ||
          isDatabaseErrorCode(error, PrismaKnownErrorCode.UniqueConstraintViolation) ||
          isDatabaseErrorCode(error, PrismaKnownErrorCode.TransactionWriteConflict)
        ) {
          return throwError(() => new ConflictException(alreadyInitializedMessage));
        }
        return throwError(() => error);
      }),
    );

    return createUser$.pipe(switchMap((user) => this.createSessionAndIssueTokens(user, metadata)));
  }

  register({ username, password, email }: RegisterDto, metadata: SessionMetadata) {
    const notInitializedMessage = this.i18nService.t('auth.SYSTEM_NOT_INITIALIZED');
    const userAlreadyExistsMessage = this.i18nService.t('auth.USER_ALREADY_EXISTS');
    const usernameAlreadyExistsMessage = this.i18nService.t('auth.USERNAME_ALREADY_EXISTS');
    const emailAlreadyExistsMessage = this.i18nService.t('auth.EMAIL_ALREADY_EXISTS');

    return from(this.prismaService.user.findFirst({ select: { id: true } })).pipe(
      map((initializedUser) => {
        // 如果系统未初始化，则禁止注册
        if (!initializedUser) throw new ForbiddenException(notInitializedMessage);
        return initializedUser;
      }),
      switchMap(() => defer(() => hash(password, BCRYPT_SALT_ROUNDS))),
      switchMap((passwordHash) =>
        from(
          this.prismaService.user.create({
            data: { username, password: passwordHash, email },
            select: { id: true, username: true, role: true },
          }),
        ),
      ),
      catchError((error: Error) => {
        if (isDatabaseErrorCode(error, PrismaKnownErrorCode.UniqueConstraintViolation)) {
          const target = getDatabaseUniqueConflictTarget(error);
          const message = target === 'user_username_key' ? usernameAlreadyExistsMessage : target === 'user_email_key' ? emailAlreadyExistsMessage : userAlreadyExistsMessage;
          return throwError(() => new ConflictException(message));
        }
        return throwError(() => error);
      }),
      switchMap((user) => this.createSessionAndIssueTokens(user, metadata)),
    );
  }

  refresh(refreshToken: string, metadata: SessionMetadata) {
    // 因为刷新令牌是会话的一部分，所以需要通过哈希值来验证刷新令牌的有效性
    const oldRefreshTokenHash = hashToken(refreshToken);

    return this.verifyRefreshToken(refreshToken).pipe(
      // 验证刷新令牌
      switchMap((claims) =>
        from(
          this.prismaService.authSession.findUnique({
            where: { refreshTokenHash: oldRefreshTokenHash },
            include: { user: { select: { id: true, username: true, role: true } } },
          }),
        ).pipe(map((session) => ({ claims, session }))),
      ),
      map(({ claims, session }) => {
        const isInvalid =
          !session ||
          session.revokedTime !== null ||
          session.expiresTime <= new Date() ||
          session.userId !== claims.id ||
          session.user.username !== claims.username ||
          session.user.role !== claims.role;
        if (isInvalid) throw new UnauthorizedException(this.i18nService.t('auth.INVALID_REFRESH_TOKEN'));
        return session;
      }),
      switchMap((session) =>
        this.signTokens(session.user, session.id).pipe(
          switchMap((tokens) =>
            from(
              this.prismaService.authSession.updateMany({
                where: {
                  id: session.id,
                  refreshTokenHash: oldRefreshTokenHash,
                  revokedTime: null,
                  expiresTime: { gt: new Date() },
                },
                data: {
                  refreshTokenHash: hashToken(tokens.refreshToken),
                  expiresTime: new Date(Date.now() + this.jwtConfiguration.refreshTtlSeconds * 1000),
                  lastUsedTime: new Date(),
                  ipAddress: normalizeIp(metadata.ipAddress),
                  userAgent: metadata.userAgent?.slice(0, 512),
                },
              }),
            ).pipe(
              map(({ count }) => {
                if (count !== 1) throw new UnauthorizedException(this.i18nService.t('auth.INVALID_REFRESH_TOKEN'));
                return tokens;
              }),
            ),
          ),
        ),
      ),
    );
  }

  logout({ id, sessionId }: AuthUserPayload) {
    return from(
      this.prismaService.authSession.updateMany({
        where: { id: sessionId, userId: id, revokedTime: null },
        data: { revokedTime: new Date() },
      }),
    ).pipe(map(() => ResponseResult.success(this.i18nService.t('auth.LOGOUT_SUCCESS'))));
  }

  /**
   * 修改用户密码
   * @param { id, sessionId } 当前用户ID、当前会话ID
   * @param { currentPassword, newPassword } 当前密码、新密码
   * @returns
   */
  changePassword({ id, sessionId }: AuthUserPayload, { currentPassword, newPassword }: ChangePasswordDto) {
    return from(this.prismaService.user.findUnique({ where: { id } })).pipe(
      switchMap((user) => {
        if (!user) throw new UnauthorizedException(this.i18nService.t('auth.INVALID_ACCESS_TOKEN'));
        // 当前密码错误同样计入账户锁定，防止持有令牌的攻击者暴力猜测密码
        return from(this.verifyPasswordWithLockout(user, currentPassword));
      }),
      map((passwordMatches) => {
        if (!passwordMatches) throw new BadRequestException(this.i18nService.t('auth.INVALID_CURRENT_PASSWORD'));
        return passwordMatches;
      }),
      switchMap(() => defer(() => hash(newPassword, BCRYPT_SALT_ROUNDS))),
      switchMap((passwordHash) =>
        from(
          this.prismaService.$transaction([
            this.prismaService.user.update({ where: { id }, data: { password: passwordHash } }),
            // 注销除当前会话外的其他会话：踢掉可能被盗用的会话，同时保留本次操作的登录状态
            this.prismaService.authSession.updateMany({
              where: { userId: id, revokedTime: null, id: { not: sessionId } },
              data: { revokedTime: new Date() },
            }),
          ]),
        ),
      ),
      map(() => ResponseResult.success(this.i18nService.t('auth.PASSWORD_CHANGED'))),
    );
  }

  /**
   * 根据用户ID查找会话
   * @param id 用户ID
   * @param sessionId 会话ID
   * @returns
   */
  findSessions({ id, sessionId }: AuthUserPayload) {
    const now = new Date();
    return from(
      this.prismaService.authSession.findMany({
        where: { userId: id, revokedTime: null, expiresTime: { gt: now } },
        orderBy: { lastUsedTime: 'desc' },
        select: {
          id: true,
          ipAddress: true,
          userAgent: true,
          lastUsedTime: true,
          expiresTime: true,
          createdTime: true,
        },
      }),
    ).pipe(map((sessions) => sessions.map((session) => ({ ...session, current: session.id === sessionId }))));
  }

  /**
   * 根据用户ID和会话ID删除会话
   * @param userId 用户ID
   * @param sessionId 会话ID
   * @returns
   */
  deleteSession(userId: User['id'], sessionId: string) {
    return from(
      this.prismaService.authSession.updateMany({
        where: { id: sessionId, userId, revokedTime: null },
        data: { revokedTime: new Date() },
      }),
    ).pipe(
      map(({ count }) => {
        if (count === 0) throw new NotFoundException(this.i18nService.t('auth.SESSION_NOT_FOUND'));
        return ResponseResult.success(this.i18nService.t('auth.SESSION_REVOKED'));
      }),
    );
  }

  /**
   * 根据用户ID查找用户
   * @param id 用户ID
   * @returns
   */
  findUserById(id: User['id']) {
    return from(
      this.prismaService.user.findUnique({
        where: { id },
        select: { id: true, username: true, email: true, role: true, createdTime: true, updatedTime: true },
      }),
    ).pipe(
      map((user) => {
        if (!user) throw new UnauthorizedException(this.i18nService.t('auth.INVALID_ACCESS_TOKEN'));
        return user;
      }),
    );
  }

  /**
   * 创建会话并签发令牌
   * @param user
   * @param metadata
   * @returns
   */
  private createSessionAndIssueTokens(user: AuthUserClaims, metadata: SessionMetadata) {
    const sessionId = randomUUID();
    // 淘汰超额会话：查出按最近使用时间排序后第 MAX 个及之后的活跃会话
    // （保留最新的 MAX-1 个，加上本次新建的会话，正好不超过上限）
    const evictExcessSessions$ = from(
      this.prismaService.authSession.findMany({
        where: { userId: user.id, revokedTime: null, expiresTime: { gt: new Date() } },
        orderBy: { lastUsedTime: 'desc' },
        skip: MAX_ACTIVE_SESSIONS_PER_USER - 1,
        select: { id: true },
      }),
    ).pipe(
      switchMap((excessSessions) =>
        excessSessions.length === 0
          ? of(null)
          : from(
              this.prismaService.authSession.updateMany({
                where: { id: { in: excessSessions.map((session) => session.id) } },
                data: { revokedTime: new Date() },
              }),
            ),
      ),
    );

    return evictExcessSessions$.pipe(
      switchMap(() => this.signTokens(user, sessionId)),
      switchMap((tokens) =>
        from(
          this.prismaService.authSession.create({
            data: {
              id: sessionId,
              userId: user.id,
              refreshTokenHash: hashToken(tokens.refreshToken),
              expiresTime: new Date(Date.now() + this.jwtConfiguration.refreshTtlSeconds * 1000),
              ipAddress: normalizeIp(metadata.ipAddress),
              userAgent: metadata.userAgent?.slice(0, 512),
            },
          }),
        ).pipe(map(() => tokens)),
      ),
    );
  }

  /**
   * 签发令牌
   * @param user
   * @param sessionId
   * @returns
   */
  private signTokens(user: AuthUserClaims, sessionId: string): Observable<AuthTokens> {
    const claims = { id: user.id, username: user.username, role: user.role };

    return forkJoin({
      accessToken: defer(() =>
        this.jwtService.signAsync<AuthUserClaims>(claims, {
          expiresIn: this.jwtConfiguration.accessTtlSeconds,
          jwtid: sessionId,
        }),
      ),
      refreshToken: defer(() =>
        this.jwtService.signAsync<AuthUserClaims>(claims, {
          expiresIn: this.jwtConfiguration.refreshTtlSeconds,
          audience: getRefreshTokenAudience(this.jwtConfiguration.audience),
          jwtid: randomUUID(),
        }),
      ),
    });
  }

  /**
   * 验证刷新令牌
   * @param refreshToken
   * @returns
   */
  private verifyRefreshToken(refreshToken: string): Observable<AuthTokenClaims> {
    return defer(() =>
      this.jwtService.verifyAsync<AuthTokenClaims>(refreshToken, {
        publicKey: this.jwtConfiguration.publicKey,
        algorithms: ['RS256'],
        issuer: this.jwtConfiguration.issuer,
        audience: getRefreshTokenAudience(this.jwtConfiguration.audience),
      }),
    ).pipe(
      map((payload) => {
        if (!Number.isInteger(payload.id) || !payload.username || !payload.role || !payload.jti) throw new UnauthorizedException(this.i18nService.t('auth.INVALID_REFRESH_TOKEN'));
        return payload;
      }),
      catchError(() => throwError(() => new UnauthorizedException(this.i18nService.t('auth.INVALID_REFRESH_TOKEN')))),
    );
  }

  /**
   * 定时清理无效会话（每天凌晨 3 点执行），防止 auth_session 表无限增长：
   * - 已过期的会话：refresh token 已不可用，记录无保留价值
   * - 已撤销且超过保留期的会话：保留期内的记录可用于安全审计追溯
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupStaleSessions() {
    // 撤销时间早于该时间点的会话视为超过保留期
    const revokedBefore = new Date(Date.now() - REVOKED_SESSION_RETENTION_DAYS * 86_400_000);
    const { count } = await this.prismaService.authSession.deleteMany({
      where: { OR: [{ expiresTime: { lt: new Date() } }, { revokedTime: { lt: revokedBefore } }] },
    });
    if (count > 0) Logger.log(`已清理 ${count} 条无效会话`, AuthService.name);
  }
}
