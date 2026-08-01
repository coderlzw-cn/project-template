import { SkipLicense } from '@/license/skip-license.decorator';
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '@/decorators/public.decorator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { AuthEnabledGuard } from './guard/auth-enabled.guard';
import { LocalAuthGuard } from './guard/local-auth.guard';
import { type Request } from 'express';
import { AuthUser } from '@/decorators/auth-user.decoratior';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

const getSessionMetadata = (request: Request) => ({
  ipAddress: request.clientIp ?? request.ip,
  userAgent: request.get('user-agent'),
});

@SkipLicense()
@ApiTags('认证')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Get('initialized')
  @ApiOperation({ summary: '检查系统是否已完成初始化' })
  initialized() {
    return this.authService.isInitialized();
  }

  @Public()
  @UseGuards(AuthEnabledGuard, LocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  // 比全局限流更严格：防止暴力破解密码
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  @ApiOperation({ summary: '用户名密码登录并签发访问令牌' })
  login(@Body() _credentials: LoginDto, @Req() request: Request) {
    return this.authService.login(request.user!, getSessionMetadata(request));
  }



  @Public()
  @UseGuards(AuthEnabledGuard)
  @Post('initialize')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '创建首个管理员并完成系统初始化' })
  initialize(@Body() initializeDto: RegisterDto, @Req() request: Request) {
    return this.authService.initialize(initializeDto, getSessionMetadata(request));
  }

  @Public()
  @UseGuards(AuthEnabledGuard)
  // 开放注册，限流防止批量刷账号
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '注册用户（需系统已完成初始化）' })
  register(@Body() registerDto: RegisterDto, @Req() request: Request) {
    return this.authService.register(registerDto, getSessionMetadata(request));
  }

  @Public()
  @UseGuards(AuthEnabledGuard)
  // 防止暴力尝试伪造/枚举刷新令牌
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '使用刷新令牌签发新的访问令牌和刷新令牌' })
  refresh(@Body() body: RefreshTokenDto, @Req() request: Request) {
    return this.authService.refresh(body.refreshToken, getSessionMetadata(request));
  }

  @ApiBearerAuth()
  @UseGuards(AuthEnabledGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '注销当前会话' })
  logout(@AuthUser() authUser: AuthUserPayload) {
    return this.authService.logout(authUser);
  }

  @ApiBearerAuth()
  @UseGuards(AuthEnabledGuard)
  // 防止暴力猜测当前密码
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '修改当前用户密码并注销其他会话（保留当前会话）' })
  changePassword(@AuthUser() authUser: AuthUserPayload, @Body() body: ChangePasswordDto) {
    return this.authService.changePassword(authUser, body);
  }

  @ApiBearerAuth()
  @UseGuards(AuthEnabledGuard)
  @Get('sessions')
  @ApiOperation({ summary: '查询当前用户的有效会话' })
  sessions(@AuthUser() authUser: AuthUserPayload) {
    return this.authService.findSessions(authUser);
  }

  @ApiBearerAuth()
  @UseGuards(AuthEnabledGuard)
  @Delete('sessions/:sessionId')
  @ApiOperation({ summary: '注销指定会话' })
  deleteSession(@AuthUser() authUser: AuthUserPayload, @Param('sessionId', new ParseUUIDPipe()) sessionId: string) {
    return this.authService.deleteSession(authUser.id, sessionId);
  }

  @ApiBearerAuth()
  @UseGuards(AuthEnabledGuard)
  @ApiOperation({ summary: '认证用户信息' })
  @Get('profile')
  profile(@AuthUser() authUser: AuthUserPayload) {
    return this.authService.findUserById(authUser.id);
  }
}
