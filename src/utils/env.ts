import 'dotenv/config';

/**
 * 获取字符串环境变量
 * @param key 环境变量名称
 * @param defaultValue 默认值（可选）
 */
// 重载 1：传了默认值，就一定返回字符串
export function getEnvStr(key: string, defaultValue: string): string;
export function getEnvStr(key: string): string | undefined;
export function getEnvStr(key: string, defaultValue?: string): string | undefined {
  const val = process.env[key];
  return val === undefined || val === '' ? defaultValue : val;
}

/**
 * 获取数字环境变量
 * @param key 环境变量名称
 * @param defaultValue 默认值（可选）
 */
export function getEnvNum(key: string, defaultValue: number): number;
export function getEnvNum(key: string): number | undefined;
export function getEnvNum(key: string, defaultValue?: number) {
  const val = process.env[key];
  if (val === undefined || val === '') {
    return defaultValue;
  }
  const num = Number(val);
  return Number.isNaN(num) ? defaultValue : num;
}

/**
 * 获取布尔环境变量
 * @param key 环境变量名称
 * @param defaultValue 默认值（可选）
 */
export function getEnvBool(key: string, defaultValue?: boolean) {
  const val = process.env[key];
  if (val === undefined || val === '') {
    return defaultValue;
  }

  const cleanVal = val.trim().toLowerCase();

  if (cleanVal === 'true' || cleanVal === '1' || cleanVal === 'yes') {
    return true;
  }

  if (cleanVal === 'false' || cleanVal === '0' || cleanVal === 'no') {
    return false;
  }

  return defaultValue;
}

/**
 * 获取数组环境变量（默认以逗号分隔）
 * @param key 环境变量名称
 * @param defaultValue 默认值（可选）
 * @param separator 分隔符，默认为逗号
 */
export function getEnvArray(key: string, defaultValue?: string[], separator = ',') {
  const val = process.env[key];
  if (val === undefined || val === '') {
    return defaultValue;
  }
  return val.split(separator).map((item) => item.trim());
}

/**
 * 获取字面量联合类型环境变量（如果值不在允许的列表中，则强制回滚到默认值）
 * @param key 环境变量名称
 * @param allowedValues 允许的值组成的数组
 * @param defaultValue 默认值
 * @example const nodeEnv = getUnion('NODE_ENV', ['development', 'production', 'test'] as const, 'development');
 */
export function getEnvUnion<T extends string>(key: string, allowedValues: T[], defaultValue: T): T {
  const val = process.env[key] as T | undefined;
  if (val === undefined || val === '' || !allowedValues.includes(val)) {
    return defaultValue;
  }
  return val;
}

/**
 * 获取 JSON 对象环境变量（内置 try-catch 安全解析）
 * @param key 环境变量名称
 * @param defaultValue 默认值（可选）
 */
export function getEnvJson<T = any>(key: string, defaultValue?: T): T | undefined {
  const val = process.env[key];
  if (val === undefined || val === '') {
    return defaultValue;
  }

  try {
    return JSON.parse(val) as T;
  } catch (error) {
    // 如果 JSON 格式非法，打印警告并返回默认值
    console.warn(`[EnvError] Failed to parse JSON for env key "${key}":`, error);
    return defaultValue;
  }
}

/**
 * 获取严格的整数环境变量（自动截断小数部分）
 * @param key 环境变量名称
 * @param defaultValue 默认值（可选）
 * @param radix 进制，默认 10 进制
 */
export function getEnvInt(key: string, defaultValue?: number, radix = 10): number | undefined {
  const val = process.env[key];
  if (val === undefined || val === '') {
    return defaultValue;
  }

  const parsed = parseInt(val, radix);
  return Number.isNaN(parsed) ? defaultValue : parsed;
}

export const environment = getEnvUnion('NODE_ENV', ['development', 'production', 'test'], 'development');
export const isDevelopment = getEnvUnion('NODE_ENV', ['development', 'production', 'test'], 'development') === 'development';
export const isProduction = getEnvUnion('NODE_ENV', ['development', 'production', 'test'], 'production') === 'production';
