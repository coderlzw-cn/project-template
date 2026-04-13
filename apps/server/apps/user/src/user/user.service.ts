import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from '../generated/prisma/browser';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UserService {
  async create(createUserDto: CreateUserDto): Promise<User> {
    return this.prisma.user.create({
      data: createUserDto,
    });
  }
  constructor(private prisma: PrismaService) { }

  async findAll(): Promise<User[]> {
    return this.prisma.user.findMany();
  }
}
