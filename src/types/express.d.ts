import type { User as PrismaUser } from '@/generated/prisma/client';

declare global {
  type AuthUserPayload = Pick<PrismaUser, 'id' | 'username' | 'role'> & {
    sessionId: string;
  };
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface User extends PrismaUser {}
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface AuthInfo extends AuthUserPayload {}

    interface Request {
      clientIp?: string;
      /** nestjs-i18n 根据请求头解析后的规范化语言。 */
      i18nLang?: string;
      requestId: string;
    }
  }
}

export {};
