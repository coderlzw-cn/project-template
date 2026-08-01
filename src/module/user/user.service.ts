import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/module/prisma/prisma.service';

@Injectable()
export class UserService {
  constructor(private readonly prismaService: PrismaService) {}

  finAll() {
    return this.prismaService.user.findMany({
      select: { id: true, username: true, email: true, role: true, createdTime: true, updatedTime: true },
    });
  }
}
