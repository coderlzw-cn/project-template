import { ApiProperty } from '@nestjs/swagger';
import { IsJWT, IsNotEmpty, IsString } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class RefreshTokenDto {
  @ApiProperty({ description: '登录或刷新时签发的 refresh token' })
  @IsJWT({ message: i18nValidationMessage('validation.IS_JWT', { property: '刷新令牌' }) })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY', { property: '刷新令牌' }) })
  @IsString({ message: i18nValidationMessage('validation.IS_STRING', { property: '刷新令牌' }) })
  refreshToken: string;
}
