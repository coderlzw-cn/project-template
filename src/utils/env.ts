import { parse as parseDotenv } from 'dotenv';
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import { access, chmod, readFile, rename, stat, unlink, writeFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';

const hasEnvValue = (value: string | undefined): value is string => value !== undefined && value.trim() !== '';

export const ENV_VARIABLE_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;
const SENSITIVE_ENV_NAME_PATTERN = /(?:PASSWORD|PASSWD|SECRET|TOKEN|PRIVATE|API_KEY|ACCESS_KEY|AUTH|CREDENTIAL|CONNECTION_STRING|DATABASE_URL|DSN|COOKIE|SIGNATURE)/i;
const MASKED_ENV_VALUE = '********';

export interface ProjectEnvironmentVariable {
  name: string;
  value: string;
  sensitive: boolean;
}

const assertProjectEnvName = (name: string): void => {
  if (!ENV_VARIABLE_NAME_PATTERN.test(name)) {
    throw new TypeError('Environment variable name must start with a letter or underscore and contain only letters, numbers, and underscores');
  }
};

/** 判断环境变量名是否通常承载凭据或密钥。 */
export const isSensitiveEnvName = (name: string): boolean => SENSITIVE_ENV_NAME_PATTERN.test(name);

const PROJECT_ENV_PATH = resolve(process.cwd(), '.env');
const ENV_ASSIGNMENT_PATTERN = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/;
let projectEnvMutation = Promise.resolve();

/** 列出项目根目录 .env 中声明的变量；敏感值默认脱敏。 */
export async function listProjectEnvVariables(maskSensitive = true, filePath = PROJECT_ENV_PATH): Promise<ProjectEnvironmentVariable[]> {
  const content = await readProjectEnvFile(filePath);
  const values = parseProjectEnv(content);
  return [...values.entries()].map(([name, value]) => toProjectEnvironmentVariable(name, value, maskSensitive));
}

/** 读取项目 .env 中的单个变量；不存在时返回 undefined。 */
export async function getProjectEnvVariable(name: string, maskSensitive = true, filePath = PROJECT_ENV_PATH): Promise<ProjectEnvironmentVariable | undefined> {
  assertProjectEnvName(name);
  const value = parseProjectEnv(await readProjectEnvFile(filePath)).get(name);
  return value === undefined ? undefined : toProjectEnvironmentVariable(name, value, maskSensitive);
}

/** 在项目 .env 中新增或更新变量，保留其他配置、注释和排序。 */
export async function setProjectEnvVariable(name: string, value: string, filePath = PROJECT_ENV_PATH): Promise<ProjectEnvironmentVariable> {
  assertProjectEnvName(name);
  return await serializeProjectEnvMutation(async () => {
    const content = await readProjectEnvFile(filePath);
    const serialization = /^[A-Za-z0-9_./:@-]*$/.test(value) ? value : JSON.stringify(value);

    const assignment = `${name}=${serialization}`;
    const lines = content.split(/\r?\n/);
    let replaced = false;
    const nextLines = lines.flatMap((line) => {
      if (ENV_ASSIGNMENT_PATTERN.exec(line)?.[1] !== name) return [line];
      if (replaced) return [];
      replaced = true;
      return [assignment];
    });

    if (!replaced) {
      while (nextLines.at(-1) === '') nextLines.pop();
      nextLines.push(assignment, '');
    }

    await writeProjectEnvFile(filePath, nextLines.join('\n'));
    return toProjectEnvironmentVariable(name, value, true);
  });
}

/** 从项目 .env 删除指定变量的全部声明。 */
export async function deleteProjectEnvVariable(name: string, filePath = PROJECT_ENV_PATH): Promise<boolean> {
  assertProjectEnvName(name);
  return await serializeProjectEnvMutation(async () => {
    const content = await readProjectEnvFile(filePath);
    const lines = content.split(/\r?\n/);
    const nextLines = lines.filter((line) => ENV_ASSIGNMENT_PATTERN.exec(line)?.[1] !== name);
    if (nextLines.length === lines.length) return false;
    await writeProjectEnvFile(filePath, nextLines.join('\n'));
    return true;
  });
}

function toProjectEnvironmentVariable(name: string, value: string, maskSensitive: boolean): ProjectEnvironmentVariable {
  const sensitive = isSensitiveEnvName(name);
  return {
    name,
    value: sensitive && maskSensitive ? MASKED_ENV_VALUE : value,
    sensitive,
  };
}

function parseProjectEnv(content: string): Map<string, string> {
  const parsed = parseDotenv(content);
  const values = new Map<string, string>();
  for (const line of content.split(/\r?\n/)) {
    const name = ENV_ASSIGNMENT_PATTERN.exec(line)?.[1];
    if (!name || values.has(name) || parsed[name] === undefined) continue;
    values.set(name, parsed[name]);
  }
  return values;
}

async function readProjectEnvFile(filePath: string): Promise<string> {
  try {
    return await readFile(filePath, 'utf8');
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') return '';
    throw error;
  }
}

async function writeProjectEnvFile(filePath: string, content: string): Promise<void> {
  const temporaryPath = resolve(dirname(filePath), `.${basename(filePath)}.${process.pid}.${randomUUID()}.tmp`);
  let mode = 0o600;
  try {
    await access(filePath, constants.F_OK);
    mode = (await stat(filePath)).mode;
  } catch (error) {
    if (!isNodeError(error) || error.code !== 'ENOENT') throw error;
  }

  try {
    await writeFile(temporaryPath, content, { encoding: 'utf8', mode });
    await chmod(temporaryPath, mode);
    await rename(temporaryPath, filePath);
  } catch (error) {
    await unlink(temporaryPath).catch(() => undefined);
    throw error;
  }
}

async function serializeProjectEnvMutation<T>(operation: () => Promise<T>): Promise<T> {
  const pending = projectEnvMutation.catch(() => undefined).then(operation);
  projectEnvMutation = pending.then(
    () => undefined,
    () => undefined,
  );
  return await pending;
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return typeof error === 'object' && error !== null && 'code' in error;
}

const requiredEnvError = (key: string, expectedType?: string): Error => new Error(`缺少或无效的 ${key} 环境变量${expectedType ? `，期望类型为 ${expectedType}` : ''}`);

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
  return hasEnvValue(val) ? val : defaultValue;
}

/**
 * 获取必填字符串环境变量
 * @throws 环境变量缺失或仅包含空白字符时抛出异常
 */
export function getRequiredEnvStr(key: string): string {
  const value = getEnvStr(key);

  if (value === undefined) {
    throw requiredEnvError(key, '非空字符串');
  }

  return value;
}

/**
 * 获取数字环境变量
 * @param key 环境变量名称
 * @param defaultValue 默认值（可选）
 */
export function getEnvNum(key: string, defaultValue: number): number;
export function getEnvNum(key: string): number | undefined;
export function getEnvNum(key: string, defaultValue?: number): number | undefined {
  const val = process.env[key];
  if (!hasEnvValue(val)) {
    return defaultValue;
  }

  const num = Number(val);
  return Number.isFinite(num) ? num : defaultValue;
}

/**
 * 获取必填有限数字环境变量
 * @throws 环境变量缺失或不是有限数字时抛出异常
 */
export function getRequiredEnvNum(key: string): number {
  const value = getEnvNum(key);

  if (value === undefined) {
    throw requiredEnvError(key, '有限数字');
  }

  return value;
}

/**
 * 获取布尔环境变量
 * @param key 环境变量名称
 * @param defaultValue 默认值（可选）
 */
export function getEnvBool(key: string, defaultValue: boolean): boolean;
export function getEnvBool(key: string): boolean | undefined;
export function getEnvBool(key: string, defaultValue?: boolean): boolean | undefined {
  const val = process.env[key];
  if (!hasEnvValue(val)) {
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
 * 获取必填布尔环境变量
 * @throws 环境变量缺失或不是支持的布尔值时抛出异常
 */
export function getRequiredEnvBool(key: string): boolean {
  const value = getEnvBool(key);

  if (value === undefined) {
    throw requiredEnvError(key, 'true、false、1、0、yes 或 no');
  }

  return value;
}

/**
 * 获取数组环境变量（默认以逗号分隔）
 * @param key 环境变量名称
 * @param defaultValue 默认值（可选）
 * @param separator 分隔符，默认为逗号
 */
export function getEnvArray(key: string, defaultValue: string[], separator?: string): string[];
export function getEnvArray(key: string, defaultValue?: undefined, separator?: string): string[] | undefined;
export function getEnvArray(key: string, defaultValue?: string[], separator = ','): string[] | undefined {
  const val = process.env[key];
  if (!hasEnvValue(val)) {
    return defaultValue;
  }

  return val.split(separator).map((item) => item.trim());
}

/**
 * 获取必填数组环境变量
 * @throws 环境变量缺失或仅包含空白字符时抛出异常
 */
export function getRequiredEnvArray(key: string, separator = ','): string[] {
  const value = getEnvArray(key, undefined, separator);

  if (value === undefined) {
    throw requiredEnvError(key, '分隔字符串');
  }

  return value;
}

/**
 * 获取字面量联合类型环境变量
 * @param key 环境变量名称
 * @param allowedValues 允许的值组成的数组
 * @param defaultValue 默认值（可选）
 * @example const nodeEnv = getEnvUnion('NODE_ENV', ['development', 'production', 'test'] as const, 'development');
 */
export function getEnvUnion<T extends string>(key: string, allowedValues: readonly T[], defaultValue: T): T;
export function getEnvUnion<T extends string>(key: string, allowedValues: readonly T[]): T | undefined;
export function getEnvUnion<T extends string>(key: string, allowedValues: readonly T[], defaultValue?: T): T | undefined {
  const val = process.env[key] as T | undefined;
  if (!hasEnvValue(val) || !allowedValues.includes(val)) {
    return defaultValue;
  }
  return val;
}

/**
 * 获取必填字面量联合类型环境变量
 * @throws 环境变量缺失或不在允许值列表中时抛出异常
 */
export function getRequiredEnvUnion<T extends string>(key: string, allowedValues: readonly T[]): T {
  const value = getEnvUnion(key, allowedValues);

  if (value === undefined) {
    throw requiredEnvError(key, allowedValues.join(' | '));
  }

  return value;
}

/**
 * 获取 JSON 对象环境变量（内置 try-catch 安全解析）
 * @param key 环境变量名称
 * @param defaultValue 默认值（可选）
 */
export function getEnvJson<T>(key: string, defaultValue: T): T;
export function getEnvJson<T = unknown>(key: string): T | undefined;
export function getEnvJson<T = unknown>(key: string, defaultValue?: T): T | undefined {
  const val = process.env[key];
  if (!hasEnvValue(val)) {
    return defaultValue;
  }

  try {
    return JSON.parse(val) as T;
  } catch (error: unknown) {
    // 如果 JSON 格式非法，打印警告并返回默认值
    console.warn(`[EnvError] Failed to parse JSON for env key "${key}":`, error);
    return defaultValue;
  }
}

/**
 * 获取必填 JSON 环境变量
 * @throws 环境变量缺失或 JSON 无法解析时抛出异常
 */
export function getRequiredEnvJson<T = unknown>(key: string): T {
  const value = getEnvJson<T>(key);

  if (value === undefined) {
    throw requiredEnvError(key, '有效 JSON');
  }

  return value;
}

/**
 * 获取严格的安全整数环境变量
 * @param key 环境变量名称
 * @param defaultValue 默认值（可选）
 * @param radix 进制，默认 10 进制
 */
export function getEnvInt(key: string, defaultValue: number, radix?: number): number;
export function getEnvInt(key: string, defaultValue?: undefined, radix?: number): number | undefined;
export function getEnvInt(key: string, defaultValue?: number, radix = 10): number | undefined {
  if (!Number.isInteger(radix) || radix < 2 || radix > 36) {
    throw new RangeError('radix 必须是 2 到 36 之间的整数');
  }

  const val = process.env[key];
  if (!hasEnvValue(val)) {
    return defaultValue;
  }

  const normalizedValue = val.trim();
  const unsignedValue = /^[+-]/.test(normalizedValue) ? normalizedValue.slice(1) : normalizedValue;
  const hasOnlyValidDigits =
    unsignedValue.length > 0 &&
    [...unsignedValue.toLowerCase()].every((character) => {
      const digit = Number.parseInt(character, 36);
      return Number.isInteger(digit) && digit < radix;
    });

  if (!hasOnlyValidDigits) {
    return defaultValue;
  }

  const parsed = Number.parseInt(normalizedValue, radix);
  return Number.isSafeInteger(parsed) ? parsed : defaultValue;
}

/**
 * 获取必填安全整数环境变量
 * @throws 环境变量缺失或不是指定进制的安全整数时抛出异常
 */
export function getRequiredEnvInt(key: string, radix = 10): number {
  const value = getEnvInt(key, undefined, radix);

  if (value === undefined) {
    throw requiredEnvError(key, `${radix} 进制安全整数`);
  }

  return value;
}

export const environment = getEnvUnion('NODE_ENV', ['development', 'production', 'test'], 'development');
export const isDevelopment = environment === 'development';
export const isProduction = environment === 'production';
export const isTest = environment === 'test';
