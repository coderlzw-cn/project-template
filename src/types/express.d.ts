import type { User as PrismaUser } from '@/generated/prisma/client';

declare global {
  type AuthUserPayload = Pick<PrismaUser, 'id' | 'username' | 'role'> & { sessionId: string };

  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface User extends PrismaUser {}

    interface Request {
      clientIp?: string;
      requestId: string;
    }
  }
}

export {};
