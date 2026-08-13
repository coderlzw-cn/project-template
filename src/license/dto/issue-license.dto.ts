import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { LICENSE_AUDIENCE, LICENSE_CUSTOMER, LICENSE_ISSUER } from '../license.config';
import { LicenseEdition } from '../license.interfaces';

export class IssueLicenseDto {
  @ApiProperty({ description: '客户名称或客户标识', example: LICENSE_CUSTOMER })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY', { property: '客户名称' }) })
  @IsString({ message: i18nValidationMessage('validation.IS_STRING', { property: '客户名称' }) })
  customer: string;

  @ApiPropertyOptional({ description: '产品名称', example: 'Nestjs', default: 'Nestjs' })
  @IsOptional()
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY', { property: '产品名称' }) })
  @IsString({ message: i18nValidationMessage('validation.IS_STRING', { property: '产品名称' }) })
  product: string = 'Nestjs';

  @ApiProperty({ description: '授权套餐列表', enum: LicenseEdition, isArray: true, example: [LicenseEdition.Enterprise] })
  @ArrayUnique({ message: i18nValidationMessage('validation.ARRAY_UNIQUE', { property: '授权套餐' }) })
  @IsEnum(LicenseEdition, { each: true, message: i18nValidationMessage('validation.IS_ENUM', { property: '授权套餐' }) })
  @IsArray({ message: i18nValidationMessage('validation.IS_ARRAY', { property: '授权套餐' }) })
  edition: LicenseEdition[];

  @ApiPropertyOptional({ description: '签发时间，Unix 毫秒；不传时使用当前时间', example: Date.now(), minimum: 0 })
  @Min(0, { message: i18nValidationMessage('validation.MIN', { property: '签发时间' }) })
  @IsInt({ message: i18nValidationMessage('validation.IS_INT', { property: '签发时间' }) })
  @IsOptional()
  issued_at = Date.now();

  @ApiPropertyOptional({ description: 'License 签发方', example: LICENSE_ISSUER, default: LICENSE_ISSUER })
  @IsOptional()
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY', { property: '签发方' }) })
  @IsString({ message: i18nValidationMessage('validation.IS_STRING', { property: '签发方' }) })
  issuer = LICENSE_ISSUER;

  @ApiPropertyOptional({ description: '目标使用程序', example: LICENSE_AUDIENCE, default: LICENSE_AUDIENCE })
  @IsOptional()
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY', { property: '目标程序' }) })
  @IsString({ message: i18nValidationMessage('validation.IS_STRING', { property: '目标程序' }) })
  audience = LICENSE_AUDIENCE;

  @ApiPropertyOptional({ description: '开始生效时间，Unix 毫秒；不传时使用签发时间', example: Date.now() + 30000, minimum: 0 })
  @Min(0, { message: i18nValidationMessage('validation.MIN', { property: '开始生效时间' }) })
  @IsInt({ message: i18nValidationMessage('validation.IS_INT', { property: '开始生效时间' }) })
  @IsOptional()
  not_before = this.issued_at;

  @ApiPropertyOptional({ description: '过期时间，Unix 毫秒；不传表示永不过期', example: Date.now() + 60000, minimum: 0 })
  @Min(0, { message: i18nValidationMessage('validation.MIN', { property: '过期时间' }) })
  @IsInt({ message: i18nValidationMessage('validation.IS_INT', { property: '过期时间' }) })
  @IsOptional()
  expires_at?: number;

  @ApiPropertyOptional({ description: '绑定的机器码', example: '123456' })
  @IsOptional()
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY', { property: '机器码' }) })
  @IsString({ message: i18nValidationMessage('validation.IS_STRING', { property: '机器码' }) })
  machine_id?: string;
}
