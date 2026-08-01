import { registerAs } from '@nestjs/config';
import fs from 'node:fs';
import path from 'node:path';
import { getEnvBool, getEnvNum, getEnvStr } from '@/utils/env';

const readKey = (environmentName: string, pathEnvironmentName: string, defaultPath: string): string => {
  const inlineKey = getEnvStr(environmentName);

  if (inlineKey) {
    return inlineKey.replaceAll('\\n', '\n');
  }

  const keyPath = path.resolve(process.cwd(), getEnvStr(pathEnvironmentName, defaultPath));

  return fs.readFileSync(keyPath, 'utf8');
};

export const authJwtConfig = registerAs('auth.jwt', () => ({
  enabled: getEnvBool('AUTH_ENABLED', true),    // 认证默认开启，防止环境变量漏配造成安全问题
  privateKey: readKey('JWT_PRIVATE_KEY', 'JWT_PRIVATE_KEY_PATH', 'private.pem'),  // 私钥
  publicKey: readKey('JWT_PUBLIC_KEY', 'JWT_PUBLIC_KEY_PATH', 'public.pem'),  // 公钥
  accessTtlSeconds: getEnvNum('JWT_ACCESS_TTL_SECONDS', 900),  // 访问令牌过期时间
  refreshTtlSeconds: getEnvNum('JWT_REFRESH_TTL_SECONDS', 604800),  // 刷新令牌过期时间
  issuer: getEnvStr('JWT_ISSUER', 'project-template'),  // 发行人
  audience: getEnvStr('JWT_AUDIENCE', 'project-template-api'),  // 受众
}));
