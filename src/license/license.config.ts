import { getEnvNum, getEnvStr, getRequiredEnvStr } from '@/utils/env';
import { registerAs } from '@nestjs/config';
import * as Joi from 'joi';

export const LICENSE_PRODUCT = getEnvStr('LICENSE_PRODUCT', 'Nestjs');
export const LICENSE_ISSUER = getEnvStr('LICENSE_ISSUER', 'coderlzw');
export const LICENSE_AUDIENCE = getEnvStr('LICENSE_AUDIENCE', 'web-app');
export const LICENSE_CUSTOMER = getEnvStr('LICENSE_CUSTOMER', 'zhangsan');
export const LICENSE_MAX_SIZE = getEnvNum('LICENSE_MAX_SIZE', 1048576); //  1MB

export const licenseValidationSchema = Joi.object({
  LICENSE_PATH: Joi.string().trim().min(1).default('license.lic'),
  LICENSE_MAX_SIZE: Joi.number().integer().positive().default(1048576),
  LICENSE_PRIVATE_KEY_PATH: Joi.string().trim().min(1).required(),
  LICENSE_PUBLIC_KEY_PATH: Joi.string().trim().min(1).required(),
  LICENSE_PRODUCT: Joi.string().trim().min(1).default('Nestjs'),
  LICENSE_ISSUER: Joi.string().trim().min(1).default('coderlzw'),
  LICENSE_AUDIENCE: Joi.string().trim().min(1).default('web-app'),
  LICENSE_CUSTOMER: Joi.string().trim().min(1).default('zhangsan'),
}).messages({
  'any.required': '{{#label}} 为必填配置',
  'number.base': '{{#label}} 必须为数字',
  'number.integer': '{{#label}} 必须为整数',
  'number.positive': '{{#label}} 必须为正数',
  'string.base': '{{#label}} 必须为字符串',
  'string.empty': '{{#label}} 不能为空',
  'string.min': '{{#label}} 不能为空',
});

export const licenseConfig = registerAs('license', () => ({
  licenseFilePath: getEnvStr('LICENSE_PATH', 'license.lic'),
  maxLicenseFileSize: LICENSE_MAX_SIZE,
  privateKeyPath: getRequiredEnvStr('LICENSE_PRIVATE_KEY_PATH'),
  publicKeyPath: getRequiredEnvStr('LICENSE_PUBLIC_KEY_PATH'),
  product: LICENSE_PRODUCT,
  issuer: LICENSE_ISSUER,
  audience: LICENSE_AUDIENCE,
  customer: LICENSE_CUSTOMER,
}));
