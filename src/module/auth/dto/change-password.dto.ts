import { ApiProperty } from '@nestjs/swagger';
import { IsByteLength, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class ChangePasswordDto {
  @ApiProperty({ description: '当前密码', format: 'password', maxLength: 72 })
  @IsByteLength(1, 72, { message: i18nValidationMessage('auth.VALIDATION.PASSWORD_BYTE_LENGTH') })
  @IsNotEmpty({ message: i18nValidationMessage('auth.VALIDATION.CURRENT_PASSWORD_REQUIRED') })
  @IsString({ message: i18nValidationMessage('auth.VALIDATION.PASSWORD_STRING') })
  currentPassword: string;

  @ApiProperty({ description: '新密码', format: 'password', minLength: 8, maxLength: 72 })
  @IsByteLength(1, 72, { message: i18nValidationMessage('auth.VALIDATION.PASSWORD_BYTE_LENGTH') })
  @MinLength(8, { message: i18nValidationMessage('auth.VALIDATION.PASSWORD_MIN_LENGTH') })
  @IsNotEmpty({ message: i18nValidationMessage('auth.VALIDATION.NEW_PASSWORD_REQUIRED') })
  @IsString({ message: i18nValidationMessage('auth.VALIDATION.PASSWORD_STRING') })
  newPassword: string;
}
