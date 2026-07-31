import { registerAs } from '@nestjs/config';
import { getEnvNum, getEnvStr } from '../utils/env';

export const appConfig = registerAs('app', () => ({
  host: getEnvStr('HOST', '127.0.0.1'),
  port: getEnvNum('PORT', 3000),
  apiPrefix: getEnvStr('PREFIX_API', 'api'),
  env: getEnvStr('NODE_ENV', 'development'),
}));

export const licenseConfig = registerAs('license', () => ({
  path: getEnvStr('LICENSE_PATH', 'license/license.json'),
}));
