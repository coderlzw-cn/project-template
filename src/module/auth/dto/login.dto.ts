import { ApiProperty } from '@nestjs/swagger';
import { IsByteLength, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class LoginDto {
  @ApiProperty({ description: '登录用户名', example: 'admin', maxLength: 64 })
  @MaxLength(64, { message: i18nValidationMessage('validation.MAX_LENGTH', { property: '用户名' }) })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY', { property: '用户名' }) })
  @IsString({ message: i18nValidationMessage('validation.IS_STRING', { property: '用户名' }) })
  username: string;

  @ApiProperty({ description: '登录密码', example: '123456', maxLength: 72, format: 'password' })
  @IsByteLength(1, 72, { message: i18nValidationMessage('validation.IS_BYTE_LENGTH', { property: '密码' }) })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY', { property: '密码' }) })
  @IsString({ message: i18nValidationMessage('validation.IS_STRING', { property: '密码' }) })
  password: string;
}
