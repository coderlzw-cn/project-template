import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsByteLength, IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class RegisterDto {
  @ApiProperty({ description: '用户名', example: 'user', minLength: 3, maxLength: 64 })
  @MaxLength(64, { message: i18nValidationMessage('auth.VALIDATION.USERNAME_MAX_LENGTH') })
  @MinLength(3, { message: i18nValidationMessage('auth.VALIDATION.USERNAME_MIN_LENGTH') })
  @IsNotEmpty({ message: i18nValidationMessage('auth.VALIDATION.USERNAME_REQUIRED') })
  @IsString({ message: i18nValidationMessage('auth.VALIDATION.USERNAME_STRING') })
  username: string;

  @ApiProperty({ description: '密码', example: 'StrongPassword123!', minLength: 8, maxLength: 72, format: 'password' })
  @IsByteLength(1, 72, { message: i18nValidationMessage('auth.VALIDATION.PASSWORD_BYTE_LENGTH') })
  @MinLength(8, { message: i18nValidationMessage('auth.VALIDATION.PASSWORD_MIN_LENGTH') })
  @IsNotEmpty({ message: i18nValidationMessage('auth.VALIDATION.PASSWORD_REQUIRED') })
  @IsString({ message: i18nValidationMessage('auth.VALIDATION.PASSWORD_STRING') })
  password: string;

  @ApiPropertyOptional({ description: '邮箱', example: 'user@example.com' })
  @IsEmail({}, { message: i18nValidationMessage('auth.VALIDATION.EMAIL_INVALID') })
  @IsOptional()
  email?: string;
}
