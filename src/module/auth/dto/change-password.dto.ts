import { ApiProperty } from '@nestjs/swagger';
import { IsByteLength, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class ChangePasswordDto {
  @ApiProperty({ description: '当前密码', format: 'password', maxLength: 72 })
  @IsByteLength(1, 72, { message: i18nValidationMessage('validation.IS_BYTE_LENGTH', { property: '当前密码' }) })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY', { property: '当前密码' }) })
  @IsString({ message: i18nValidationMessage('validation.IS_STRING', { property: '当前密码' }) })
  currentPassword: string;

  @ApiProperty({ description: '新密码', format: 'password', minLength: 8, maxLength: 72 })
  @IsByteLength(1, 72, { message: i18nValidationMessage('validation.IS_BYTE_LENGTH', { property: '新密码' }) })
  @MinLength(8, { message: i18nValidationMessage('validation.MIN_LENGTH', { property: '新密码' }) })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY', { property: '新密码' }) })
  @IsString({ message: i18nValidationMessage('validation.IS_STRING', { property: '新密码' }) })
  newPassword: string;
}
