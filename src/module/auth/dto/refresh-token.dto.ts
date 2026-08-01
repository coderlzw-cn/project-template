import { ApiProperty } from '@nestjs/swagger';
import { IsJWT, IsNotEmpty, IsString } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class RefreshTokenDto {
  @ApiProperty({ description: '登录或刷新时签发的 refresh token' })
  @IsJWT({ message: i18nValidationMessage('auth.VALIDATION.REFRESH_TOKEN_JWT') })
  @IsNotEmpty({ message: i18nValidationMessage('auth.VALIDATION.REFRESH_TOKEN_REQUIRED') })
  @IsString({ message: i18nValidationMessage('auth.VALIDATION.REFRESH_TOKEN_STRING') })
  refreshToken: string;
}
