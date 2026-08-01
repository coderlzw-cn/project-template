import { ApiProperty } from '@nestjs/swagger';
import { IsByteLength, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class LoginDto {
  @ApiProperty({ description: '登录用户名', example: 'admin', maxLength: 64 })
  @MaxLength(64, { message: i18nValidationMessage('auth.VALIDATION.USERNAME_MAX_LENGTH') })
  @IsNotEmpty({ message: i18nValidationMessage('auth.VALIDATION.USERNAME_REQUIRED') })
  @IsString({ message: i18nValidationMessage('auth.VALIDATION.USERNAME_STRING') })
  username: string;

  @ApiProperty({ description: '登录密码', example: '123456', maxLength: 72, format: 'password' })
  @IsByteLength(1, 72, { message: i18nValidationMessage('auth.VALIDATION.PASSWORD_BYTE_LENGTH') })
  @IsNotEmpty({ message: i18nValidationMessage('auth.VALIDATION.PASSWORD_REQUIRED') })
  @IsString({ message: i18nValidationMessage('auth.VALIDATION.PASSWORD_STRING') })
  password: string;
}
