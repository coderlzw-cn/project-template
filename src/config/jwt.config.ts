import { getEnvBool, getRequiredEnvNum, getRequiredEnvStr } from '@/utils/env';
import { registerAs } from '@nestjs/config';
import * as Joi from 'joi';
import fs from 'node:fs';
import path from 'node:path';

export const authJwtValidationSchema = Joi.object({
  AUTH_ENABLED: Joi.boolean().truthy('1', 'yes').falsy('0', 'no').sensitive(false).empty('').default(true),
  JWT_PRIVATE_KEY_PATH: Joi.string().empty(''),
  JWT_PRIVATE_KEY_PATH_PATH: Joi.string().trim().empty(''),
  JWT_PUBLIC_KEY_PATH: Joi.string().empty(''),
  JWT_PUBLIC_KEY_PATH_PATH: Joi.string().trim().empty(''),
  JWT_ACCESS_TTL_SECONDS: Joi.number().integer().positive().required(),
  JWT_REFRESH_TTL_SECONDS: Joi.number().integer().positive().required(),
  JWT_ISSUER: Joi.string().trim().min(1).required(),
  JWT_AUDIENCE: Joi.string().trim().min(1).required(),
})
  .or('JWT_PRIVATE_KEY_PATH', 'JWT_PRIVATE_KEY_PATH_PATH')
  .or('JWT_PUBLIC_KEY_PATH', 'JWT_PUBLIC_KEY_PATH_PATH')
  .messages({
    'any.required': '{{#label}} 为必填配置',
    'boolean.base': '{{#label}} 必须为 true、false、1、0、yes 或 no',
    'number.base': '{{#label}} 必须为数字',
    'number.integer': '{{#label}} 必须为整数',
    'number.positive': '{{#label}} 必须为正数',
    'object.missing': '必须至少配置 {{#peersWithLabels}} 中的一项',
    'string.base': '{{#label}} 必须为字符串',
    'string.empty': '{{#label}} 不能为空',
    'string.min': '{{#label}} 不能为空',
  });

const readKey = (environmentName: string, pathEnvironmentName: string) => {
  const inlineKey = getRequiredEnvStr(environmentName);

  if (inlineKey) {
    return inlineKey.replaceAll('\\n', '\n');
  }

  const keyPath = path.resolve(process.cwd(), getRequiredEnvStr(pathEnvironmentName));

  return fs.readFileSync(keyPath, 'utf8');
};

export const authJwtConfig = registerAs('auth.jwt', () => ({
  enabled: getEnvBool('AUTH_ENABLED', true), // 认证默认开启，防止环境变量漏配造成安全问题
  privateKey: readKey('JWT_PRIVATE_KEY_PATH', 'JWT_PRIVATE_KEY_PATH_PATH'), // 私钥
  publicKey: readKey('JWT_PUBLIC_KEY_PATH', 'JWT_PUBLIC_KEY_PATH_PATH'), // 公钥
  accessTtlSeconds: getRequiredEnvNum('JWT_ACCESS_TTL_SECONDS'), // 访问令牌过期时间
  refreshTtlSeconds: getRequiredEnvNum('JWT_REFRESH_TTL_SECONDS'), // 刷新令牌过期时间
  issuer: getRequiredEnvStr('JWT_ISSUER'), // 发行人
  audience: getRequiredEnvStr('JWT_AUDIENCE'), // 受众
}));
