import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  // imports: [PrismaService],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
