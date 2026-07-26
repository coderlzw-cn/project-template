import type { SupportedLocale } from '@/i18n/i18n';

declare global {
  namespace Express {
    interface CurrentUser {
      [key: string]: unknown;
    }

    interface Request {
      user?: CurrentUser;
      clientIp?: string;
      requestId: string;
      locale: SupportedLocale;
    }
  }
}

export {};
