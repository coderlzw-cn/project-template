declare global {
  namespace Express {
    interface CurrentUser {
      [key: string]: unknown;
    }

    interface Request {
      user?: CurrentUser;
      clientIp?: string;
      requestId: string;
    }
  }
}

export {};
