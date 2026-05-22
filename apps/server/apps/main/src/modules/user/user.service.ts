import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { of } from 'rxjs';

const userPublicSelect = {
  id: true,
  email: true,
  username: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export type UserPublic = Prisma.UserGetPayload<{ select: typeof userPublicSelect }>;

@Injectable()
export class UserService {
  constructor(private readonly prismaService: PrismaService) {}

    findAll()  {
    // return this.prismaService.user.findMany({
    //   select: userPublicSelect,
    //   orderBy: { id: 'desc' },
    // });
    return of(BigInt(10))
  }

  async findOne(id: number): Promise<UserPublic> {
    const user = await this.prismaService.user.findUnique({
      where: { id },
      select: userPublicSelect,
    });
    if (!user) {
      throw new NotFoundException(`用户 id=${id} 不存在`);
    }
    return user;
  }

  async create(dto: CreateUserDto): Promise<UserPublic> {
    try {
      return await this.prismaService.user.create({
        data: {
          email: dto.email,
          username: dto.username,
          password: dto.password,
        },
        select: userPublicSelect,
      });
    } catch (e) {
      this.rethrowUnique(e);
    }
  }

  async update(id: number, dto: UpdateUserDto): Promise<UserPublic> {
    await this.ensureExists(id);
    const data: Prisma.UserUpdateInput = {};
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.username !== undefined) data.username = dto.username;
    if (dto.password !== undefined) data.password = dto.password;
    if (Object.keys(data).length === 0) {
      return this.findOne(id);
    }
    try {
      return await this.prismaService.user.update({
        where: { id },
        data,
        select: userPublicSelect,
      });
    } catch (e) {
      this.rethrowUnique(e);
    }
  }

  async remove(id: number): Promise<void> {
    await this.ensureExists(id);
    await this.prismaService.user.delete({ where: { id } });
  }

  private async ensureExists(id: number): Promise<void> {
    const n = await this.prismaService.user.count({ where: { id } });
    if (n === 0) {
      throw new NotFoundException(`用户 id=${id} 不存在`);
    }
  }

  private rethrowUnique(e: unknown): never {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      throw new ConflictException('邮箱或用户名已被占用');
    }
    throw e;
  }
}
