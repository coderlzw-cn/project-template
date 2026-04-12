import 'express';
import { User } from './generated/prisma/client';

declare module 'express' {
  interface Request {
    user: User;
  }
}
