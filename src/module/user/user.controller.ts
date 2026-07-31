import { Controller, Get } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { UserService } from './user.service';
import { SkipLicense } from '@/license/skip-license.decorator';

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

@SkipLicense()
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
