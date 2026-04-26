import { registerAs } from '@nestjs/config';
import path from 'path';

type EnvSource = NodeJS.ProcessEnv | Record<string, unknown>;

function getStringEnv(source: EnvSource, key: string, fallback?: string): string {
  const value = source[key];
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }

  if (fallback !== undefined) {
    return fallback;
  }

  throw new Error(`Environment variable "${key}" is required`);
}

function getNumberEnv(source: EnvSource, key: string, fallback?: number): number {
  const value = source[key];

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  if (fallback !== undefined) {
    return fallback;
  }

  throw new Error(`Environment variable "${key}" must be a valid number`);
}

function getBooleanEnv(source: EnvSource, key: string, fallback = false): boolean {
  const value = source[key];

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    if (value === 'true') {
      return true;
    }

    if (value === 'false') {
      return false;
    }
  }

  return fallback;
}

function getApiPrefix(source: EnvSource): string {
  const apiPrefix = getStringEnv(source, 'PREFIX_API', '/api');
  return apiPrefix.startsWith('/') ? apiPrefix : `/${apiPrefix}`;
}

export const envFilePath = [path.join(process.cwd(), '.env'), path.join(process.cwd(), '.env.production'), path.join(process.cwd(), '.env.development')];

export function validateEnv(env: Record<string, unknown>) {
  return {
    ...env,
    NODE_ENV: getStringEnv(env, 'NODE_ENV', 'development'),
    HOST: getStringEnv(env, 'HOST', '127.0.0.1'),
    PORT: getNumberEnv(env, 'PORT', 3000),
    PREFIX_API: getApiPrefix(env),
    CONSUL_HOST: getStringEnv(env, 'CONSUL_HOST', '127.0.0.1'),
    CONSUL_PORT: getNumberEnv(env, 'CONSUL_PORT', 8500),
    CONSUL_TIMEOUT: getNumberEnv(env, 'CONSUL_TIMEOUT', 5000),
    CONSUL_REGISTER: getBooleanEnv(env, 'CONSUL_REGISTER'),
    CONSUL_DISCOVER: getBooleanEnv(env, 'CONSUL_DISCOVER'),
    CONSUL_RETRY_MAX_RETRIES: getNumberEnv(env, 'CONSUL_RETRY_MAX_RETRIES', 3),
    CONSUL_RETRY_INTERVAL: getNumberEnv(env, 'CONSUL_RETRY_INTERVAL', 1000),
    CONSUL_RETRY_EXPONENTIAL_BACKOFF: getBooleanEnv(env, 'CONSUL_RETRY_EXPONENTIAL_BACKOFF'),
    CONSUL_RETRY_MAX_INTERVAL: getNumberEnv(env, 'CONSUL_RETRY_MAX_INTERVAL', 30000),
    REDIS_HOST: getStringEnv(env, 'REDIS_HOST', '127.0.0.1'),
    REDIS_PORT: getNumberEnv(env, 'REDIS_PORT', 6379),
    REDIS_DB: getNumberEnv(env, 'REDIS_DB', 0),
    REDIS_CONNECT_TIMEOUT: getNumberEnv(env, 'REDIS_CONNECT_TIMEOUT', 10000),
    REDIS_LAZY_CONNECT: getBooleanEnv(env, 'REDIS_LAZY_CONNECT'),
  };
}

export const appConfig = registerAs('app', () => ({
  env: getStringEnv(process.env, 'NODE_ENV', 'development'),
  host: getStringEnv(process.env, 'HOST', '127.0.0.1'),
  port: getNumberEnv(process.env, 'PORT', 3000),
  apiPrefix: getApiPrefix(process.env),
}));

export const consulConfig = registerAs('consul', () => ({
  host: getStringEnv(process.env, 'CONSUL_HOST', '127.0.0.1'),
  port: getNumberEnv(process.env, 'CONSUL_PORT', 8500),
  protocol: getStringEnv(process.env, 'CONSUL_PROTOCOL', 'http') as 'http' | 'https',
  register: getBooleanEnv(process.env, 'CONSUL_REGISTER'),
  discover: getBooleanEnv(process.env, 'CONSUL_DISCOVER'),
  timeout: getNumberEnv(process.env, 'CONSUL_TIMEOUT', 5000),
  datacenter: process.env.CONSUL_DATACENTER,
  token: process.env.CONSUL_TOKEN,
  service: {
    ID: process.env.CONSUL_SERVICE_ID,
    Name: getStringEnv(process.env, 'CONSUL_SERVICE_NAME', 'nestjs-service'),
    Address: getStringEnv(process.env, 'CONSUL_SERVICE_ADDRESS', getStringEnv(process.env, 'HOST', '127.0.0.1')),
    Port: getNumberEnv(process.env, 'CONSUL_SERVICE_PORT', getNumberEnv(process.env, 'PORT', 3000)),
    Tags: process.env.CONSUL_SERVICE_TAGS ? process.env.CONSUL_SERVICE_TAGS.split(',') : [],
    Check: {
      HTTP: getStringEnv(
        process.env,
        'CONSUL_HEALTH_CHECK_HTTP',
        `http://${getStringEnv(process.env, 'HOST', '127.0.0.1')}:${getNumberEnv(process.env, 'PORT', 3000)}/api/health`,
      ),
      Interval: getStringEnv(process.env, 'CONSUL_HEALTH_CHECK_INTERVAL', '10s'),
      Timeout: getStringEnv(process.env, 'CONSUL_HEALTH_CHECK_TIMEOUT', '3s'),
      DeregisterCriticalServiceAfter: getStringEnv(process.env, 'CONSUL_DEREGISTER_AFTER', '30s'),
    },
  },
  retry: {
    maxRetries: getNumberEnv(process.env, 'CONSUL_RETRY_MAX_RETRIES', 3),
    retryInterval: getNumberEnv(process.env, 'CONSUL_RETRY_INTERVAL', 1000),
    exponentialBackoff: getBooleanEnv(process.env, 'CONSUL_RETRY_EXPONENTIAL_BACKOFF'),
    maxRetryInterval: getNumberEnv(process.env, 'CONSUL_RETRY_MAX_INTERVAL', 30000),
  },
}));

export const ioredisConfig = registerAs('ioredis', () => ({
  host: getStringEnv(process.env, 'REDIS_HOST', '127.0.0.1'),
  port: getNumberEnv(process.env, 'REDIS_PORT', 6379),
  password: process.env.REDIS_PASSWORD,
  db: getNumberEnv(process.env, 'REDIS_DB', 0),
  keyPrefix: process.env.REDIS_KEY_PREFIX,
  connectTimeout: getNumberEnv(process.env, 'REDIS_CONNECT_TIMEOUT', 10000),
  lazyConnect: getBooleanEnv(process.env, 'REDIS_LAZY_CONNECT'),
  maxRetriesPerRequest: process.env.REDIS_MAX_RETRIES_PER_REQUEST ? getNumberEnv(process.env, 'REDIS_MAX_RETRIES_PER_REQUEST') : undefined,
}));
