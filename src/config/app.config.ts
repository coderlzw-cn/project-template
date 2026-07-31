import { registerAs } from '@nestjs/config';
import fs from 'node:fs';
import path from 'node:path';
import { getEnvStr, getEnvNum } from '../utils/env';

export const appConfig = registerAs('app', () => ({
  host: getEnvStr('HOST', '127.0.0.1'),
  port: getEnvNum('PORT', 3000),
  apiPrefix: getEnvStr('PREFIX_API', 'api'),
  env: getEnvStr('NODE_ENV', 'development'),
}));

export const jwtConfig = registerAs('jwt', () => ({
  privateKey: fs.readFileSync(path.join(process.cwd(), 'private.pem'), 'utf8'),
  publicKey: fs.readFileSync(path.join(process.cwd(), 'public.pem'), 'utf8'),
  expiresIn: getEnvStr('JWT_EXPIRES_IN', '1d'),
  refreshSecret: getEnvStr('JWT_REFRESH_SECRET', '1d'),
  refreshExpiresIn: getEnvStr('JWT_REFRESH_EXPIRES_IN', '1d'),
}));

export const licenseConfig = registerAs('license', () => ({
  path: getEnvStr('LICENSE_PATH', 'license/license.json'),
}));
