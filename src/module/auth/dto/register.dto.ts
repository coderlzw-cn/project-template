import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsByteLength, IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class RegisterDto {
  @ApiProperty({ description: '用户名', example: 'user', minLength: 3, maxLength: 64 })
  @MaxLength(64, { message: i18nValidationMessage('validation.MAX_LENGTH', { property: '用户名' }) })
  @MinLength(3, { message: i18nValidationMessage('validation.MIN_LENGTH', { property: '用户名' }) })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY', { property: '用户名' }) })
  @IsString({ message: i18nValidationMessage('validation.IS_STRING', { property: '用户名' }) })
  username: string;

  @ApiProperty({ description: '密码', example: 'StrongPassword123!', minLength: 8, maxLength: 72, format: 'password' })
  @IsByteLength(1, 72, { message: i18nValidationMessage('validation.IS_BYTE_LENGTH', { property: '密码' }) })
  @MinLength(8, { message: i18nValidationMessage('validation.MIN_LENGTH', { property: '密码' }) })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY', { property: '密码' }) })
  @IsString({ message: i18nValidationMessage('validation.IS_STRING', { property: '密码' }) })
  password: string;

  @ApiPropertyOptional({ description: '邮箱', example: 'user@example.com' })
  @IsEmail({}, { message: i18nValidationMessage('validation.IS_EMAIL', { property: '邮箱' }) })
  @IsOptional()
  email?: string;
}
