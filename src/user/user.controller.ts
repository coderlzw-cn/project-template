import { Controller, Get, Req } from '@nestjs/common';
import { UserService } from './user.service';
import { ApiOperation } from '@nestjs/swagger';
import { type Request } from 'express';
import { SensitiveFields } from '@/decorators/sensitive.decorator';
import { Serialize } from '@/decorators/serialize.decorator';
import { Expose, Transform } from 'class-transformer';


export class UserVo {
  @Expose()
  id: number;

  @Expose()
  name: string;

  @Expose()
  age: number;

  // @Expose()
  // @Transform(({ value }: { value: Date }) => value.toISOString())
  // createdAt: string;

  // 没有声明 password，因此不会输出
}
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @ApiOperation({ summary: 'user测试' })
  @Get()
  // @SensitiveFields('password', 'phone')
  // @Serialize(UserVo)
  users() {
    return this.userService.finAll();
  }
}
