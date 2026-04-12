import { registerAs } from '@nestjs/config';
import * as fs from 'fs-extra';
import path from 'node:path';
export const appConfig = registerAs('app', () => ({
  host: process.env.HOST ?? '127.0.0.1',
  port: process.env.PORT || 3000,
  prefixApi: process.env.PREFIX_API || '/api',
}));

export const consulConfig = registerAs('consul', () => ({
  host: process.env.CONSUL_HOST || '127.0.0.1',
  port: parseInt(process.env.CONSUL_PORT || '8500', 10),
  protocol: (process.env.CONSUL_PROTOCOL || 'http') as 'http' | 'https',
  register: process.env.CONSUL_REGISTER === 'true',
  discover: process.env.CONSUL_DISCOVER === 'true',
  timeout: parseInt(process.env.CONSUL_TIMEOUT || '5000', 10),
  datacenter: process.env.CONSUL_DATACENTER,
  token: process.env.CONSUL_TOKEN,
  service: {
    ID: process.env.CONSUL_SERVICE_ID,
    Name: process.env.CONSUL_SERVICE_NAME || 'nestjs-service',
    Address: process.env.CONSUL_SERVICE_ADDRESS || process.env.HOST || '127.0.0.1',
    Port: parseInt(process.env.CONSUL_SERVICE_PORT || process.env.PORT || '3000', 10),
    Tags: process.env.CONSUL_SERVICE_TAGS ? process.env.CONSUL_SERVICE_TAGS.split(',') : [],
    Check: {
      HTTP: process.env.CONSUL_HEALTH_CHECK_HTTP || `http://${process.env.HOST || '127.0.0.1'}:${process.env.PORT || '3000'}/api/health`,
      Interval: process.env.CONSUL_HEALTH_CHECK_INTERVAL || '10s',
      Timeout: process.env.CONSUL_HEALTH_CHECK_TIMEOUT || '3s',
      DeregisterCriticalServiceAfter: process.env.CONSUL_DEREGISTER_AFTER || '30s',
    },
  },
  retry: {
    maxRetries: process.env.CONSUL_RETRY_MAX_RETRIES ? parseInt(process.env.CONSUL_RETRY_MAX_RETRIES, 10) : 3,
    retryInterval: parseInt(process.env.CONSUL_RETRY_INTERVAL || '1000', 10),
    exponentialBackoff: process.env.CONSUL_RETRY_EXPONENTIAL_BACKOFF === 'true',
    maxRetryInterval: parseInt(process.env.CONSUL_RETRY_MAX_INTERVAL || '30000', 10),
  },
}));

export const ioredisConfig = registerAs('ioredis', () => ({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0', 10),
  keyPrefix: process.env.REDIS_KEY_PREFIX,
  connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT || '10000', 10),
  lazyConnect: process.env.REDIS_LAZY_CONNECT === 'true',
  maxRetriesPerRequest: process.env.REDIS_MAX_RETRIES_PER_REQUEST ? parseInt(process.env.REDIS_MAX_RETRIES_PER_REQUEST, 10) : undefined,
}));

export const jwtConfig = registerAs('jwt', () => ({
  privateKey: fs.readFileSync(path.join(process.cwd(), 'private.pem'), 'utf8'),
  publicKey: fs.readFileSync(path.join(process.cwd(), 'public.pem'), 'utf8'),
  expiresIn: process.env.JWT_EXPIRES_IN as unknown as number,
  refreshSecret: process.env.JWT_REFRESH_SECRET,
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN as unknown as number,
}));
