import type { User } from '@/generated/prisma/client';

export type AuthUserClaims = Pick<User, 'id' | 'username' | 'role'>;

export interface AuthTokenClaims extends AuthUserClaims {
  jti?: string;
  exp?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface SessionMetadata {
  ipAddress?: string;
  userAgent?: string;
}
