import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ description: '登录用户名', example: 'admin', maxLength: 64 })
  @MaxLength(64, { message: '用户名长度不能超过 64 个字符' })
  @IsNotEmpty({ message: '用户名不能为空' })
  @IsString({ message: '用户名必须是字符串' })
  username: string;

  @ApiProperty({ description: '登录密码', example: '123456', maxLength: 128, format: 'password' })
  @MaxLength(128, { message: '密码长度不能超过 128 个字符' })
  @IsNotEmpty({ message: '密码不能为空' })
  @IsString({ message: '密码必须是字符串' })
  password: string;
}
