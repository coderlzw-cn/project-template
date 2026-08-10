export type CookieSameSite = 'strict' | 'lax' | 'none';

export type CookieOperation =
  | 'resolve'
  | 'read'
  | 'write'
  | 'remove'
  | 'serialize'
  | 'deserialize'
  | 'validate';

export interface CookieAttributes {
  /** Cookie 生效路径，默认 `/`。删除时必须传入与写入时相同的值。 */
  path?: string;
  /** Cookie 生效域。删除时必须传入与写入时相同的值。 */
  domain?: string;
  expires?: Date;
  /** 单位为秒；小于等于 0 会让浏览器立即删除 Cookie。 */
  maxAgeSeconds?: number;
  /** HTTPS 环境默认开启。SameSite=None 和 Partitioned Cookie 必须开启。 */
  secure?: boolean;
  /** 默认 `lax`。 */
  sameSite?: CookieSameSite;
  /** 启用 CHIPS 分区 Cookie；浏览器支持情况取决于版本。 */
  partitioned?: boolean;
}

export interface CookieErrorContext {
  operation: CookieOperation;
  key?: string;
  error: unknown;
}

export interface CookieWriteResult {
  ok: boolean;
  /** 最终写入 document.cookie 的 Cookie 名称。 */
  name: string;
}

export type CookieValidator<T> = (value: unknown) => value is T;

export interface CookieCodec<T> {
  encode(value: T): string;
  decode(value: string): unknown;
}

export interface CookieDocument {
  cookie: string;
}

export interface CreateCookieOptions<TSchema extends object> {
  /** 添加到每个 schema key 前的前缀，例如 `ntn_`。 */
  prefix?: string;
  defaults?: CookieAttributes;
  validators?: Partial<{ [K in keyof TSchema]: CookieValidator<TSchema[K]> }>;
  codecs?: Partial<{ [K in keyof TSchema]: CookieCodec<TSchema[K]> }>;
  document?: CookieDocument | (() => CookieDocument | null);
  /** 单条 Cookie（包含属性）的最大字节数，默认 4096。 */
  maxCookieBytes?: number;
  onError?: (context: CookieErrorContext) => void;
}

export interface TypedCookie<TSchema extends object> {
  get<K extends Extract<keyof TSchema, string>>(key: K): TSchema[K] | undefined;
  get<K extends Extract<keyof TSchema, string>>(
    key: K,
    fallback: TSchema[K],
  ): TSchema[K];
  set<K extends Extract<keyof TSchema, string>>(
    key: K,
    value: TSchema[K],
    attributes?: CookieAttributes,
  ): CookieWriteResult;
  has<K extends Extract<keyof TSchema, string>>(key: K): boolean;
  remove<K extends Extract<keyof TSchema, string>>(
    key: K,
    attributes?: CookieAttributes,
  ): CookieWriteResult;
}

const COOKIE_NAME_PATTERN = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;
const DEFAULT_MAX_COOKIE_BYTES = 4096;

const jsonCodec: CookieCodec<unknown> = {
  encode(value) {
    const encoded = JSON.stringify(value);
    if (encoded === undefined) throw new Error('Cookie 不能序列化 undefined');
    return encoded;
  },
  decode(value) {
    return JSON.parse(value) as unknown;
  },
};

function resolveDefaultSecure() {
  return typeof location !== 'undefined' && location.protocol === 'https:';
}

function assertCookieName(name: string) {
  if (!name || !COOKIE_NAME_PATTERN.test(name))
    throw new Error(`Cookie 名称无效: ${name || '<empty>'}`);
}

function hasInvalidAttributeCharacter(value: string) {
  return [...value].some(character => {
    const codePoint = character.codePointAt(0) ?? 0;
    return character === ';' || codePoint <= 31 || codePoint === 127;
  });
}

function isValidCookieDomain(domain: string) {
  const normalizedDomain = domain.startsWith('.') ? domain.slice(1) : domain;
  if (!normalizedDomain || normalizedDomain.length > 253) return false;

  return normalizedDomain.split('.').every(label => {
    return (
      label.length > 0 &&
      label.length <= 63 &&
      /^[A-Za-z0-9-]+$/.test(label) &&
      !label.startsWith('-') &&
      !label.endsWith('-')
    );
  });
}

function assertCookieAttributes(name: string, attributes: CookieAttributes) {
  if (
    attributes.path !== undefined &&
    (!attributes.path.startsWith('/') ||
      hasInvalidAttributeCharacter(attributes.path))
  )
    throw new Error('Cookie path 必须以 / 开头且不能包含控制字符或分号');

  if (
    attributes.domain !== undefined &&
    !isValidCookieDomain(attributes.domain)
  )
    throw new Error('Cookie domain 格式无效');

  if (
    attributes.expires !== undefined &&
    Number.isNaN(attributes.expires.getTime())
  )
    throw new Error('Cookie expires 必须是有效日期');

  if (
    attributes.maxAgeSeconds !== undefined &&
    !Number.isInteger(attributes.maxAgeSeconds)
  )
    throw new Error('Cookie maxAgeSeconds 必须是整数');

  if (attributes.sameSite === 'none' && !attributes.secure)
    throw new Error('SameSite=None 的 Cookie 必须启用 Secure');
  if (attributes.partitioned && !attributes.secure)
    throw new Error('Partitioned Cookie 必须启用 Secure');
  if (name.startsWith('__Secure-') && !attributes.secure)
    throw new Error('__Secure- Cookie 必须启用 Secure');
  if (
    name.startsWith('__Host-') &&
    (!attributes.secure || attributes.path !== '/' || attributes.domain)
  )
    throw new Error('__Host- Cookie 必须启用 Secure、Path=/ 且不能设置 Domain');
}

function serializeAttributes(attributes: CookieAttributes) {
  const parts: string[] = [];
  if (attributes.path) parts.push(`Path=${attributes.path}`);
  if (attributes.domain) parts.push(`Domain=${attributes.domain}`);
  if (attributes.expires)
    parts.push(`Expires=${attributes.expires.toUTCString()}`);
  if (attributes.maxAgeSeconds !== undefined)
    parts.push(`Max-Age=${attributes.maxAgeSeconds}`);
  if (attributes.sameSite)
    parts.push(
      `SameSite=${attributes.sameSite[0].toUpperCase()}${attributes.sameSite.slice(1)}`,
    );
  if (attributes.secure) parts.push('Secure');
  if (attributes.partitioned) parts.push('Partitioned');
  return parts.length ? `; ${parts.join('; ')}` : '';
}

/**
 * 将 document.cookie 解析为名称和值。Cookie 值始终按 URI 编码写入；遇到第三方写入的
 * 非法编码时保留原值，具体 schema 的 codec 随后仍可决定是否接受。
 */
function parseCookieHeader(header: string) {
  const cookies = new Map<string, string>();
  for (const item of header.split(';')) {
    const separatorIndex = item.indexOf('=');
    if (separatorIndex < 0) continue;
    const name = item.slice(0, separatorIndex).trim();
    if (!name || cookies.has(name)) continue;
    const rawValue = item.slice(separatorIndex + 1).trim();
    try {
      cookies.set(name, decodeURIComponent(rawValue));
    } catch {
      cookies.set(name, rawValue);
    }
  }
  return cookies;
}

/**
 * 创建类型安全的浏览器 Cookie 客户端。
 *
 * 客户端 JavaScript 无法创建或读取 HttpOnly Cookie。会话令牌等敏感凭证应由服务端通过
 * Set-Cookie 写入，并启用 HttpOnly、Secure 和适当的 SameSite 策略。
 */
export function createCookie<TSchema extends object>(
  options: CreateCookieOptions<TSchema> = {},
): TypedCookie<TSchema> {
  type SchemaKey = Extract<keyof TSchema, string>;
  const prefix = options.prefix ?? '';
  const maxCookieBytes = options.maxCookieBytes ?? DEFAULT_MAX_COOKIE_BYTES;

  if (!Number.isInteger(maxCookieBytes) || maxCookieBytes <= 0)
    throw new Error('maxCookieBytes 必须是正整数');

  const reportError = (
    operation: CookieOperation,
    error: unknown,
    key?: string,
  ) => {
    try {
      options.onError?.({ operation, key, error });
    } catch {
      // 错误上报失败不应影响 Cookie 主流程。
    }
  };

  const resolveDocument = () => {
    try {
      if (typeof options.document === 'function') return options.document();
      if (options.document) return options.document;
      return typeof document === 'undefined' ? null : document;
    } catch (error) {
      reportError('resolve', error);
      return null;
    }
  };

  const toCookieName = (key: SchemaKey) => {
    const name = `${prefix}${key}`;
    assertCookieName(name);
    return name;
  };

  const resolveAttributes = (attributes: CookieAttributes = {}) => ({
    path: '/',
    sameSite: 'lax' as const,
    secure: resolveDefaultSecure(),
    ...options.defaults,
    ...attributes,
  });

  const readRaw = (key: SchemaKey) => {
    const cookieDocument = resolveDocument();
    if (!cookieDocument) return undefined;
    try {
      return parseCookieHeader(cookieDocument.cookie).get(toCookieName(key));
    } catch (error) {
      reportError('read', error, key);
      return undefined;
    }
  };

  const writeRaw = (
    key: SchemaKey,
    serializedValue: string,
    attributes: CookieAttributes,
    operation: 'write' | 'remove',
  ): CookieWriteResult => {
    const name = `${prefix}${key}`;
    try {
      assertCookieName(name);
      assertCookieAttributes(name, attributes);
      const serializedCookie = `${name}=${encodeURIComponent(serializedValue)}${serializeAttributes(attributes)}`;
      const cookieBytes = new TextEncoder().encode(serializedCookie).byteLength;
      if (cookieBytes > maxCookieBytes)
        throw new Error(
          `Cookie 大小 ${cookieBytes} 字节超过限制 ${maxCookieBytes} 字节`,
        );

      const cookieDocument = resolveDocument();
      if (!cookieDocument) throw new Error('当前环境不支持 document.cookie');
      cookieDocument.cookie = serializedCookie;
      return { ok: true, name };
    } catch (error) {
      reportError(operation, error, key);
      return { ok: false, name };
    }
  };

  return {
    get(key, fallback?) {
      const rawValue = readRaw(key);
      if (rawValue === undefined) return fallback;

      try {
        const codec = options.codecs?.[key] as
          | CookieCodec<TSchema[typeof key]>
          | undefined;
        const value = (codec ?? jsonCodec).decode(rawValue);
        const validator = options.validators?.[key] as
          | CookieValidator<TSchema[typeof key]>
          | undefined;
        if (validator && !validator(value)) {
          reportError('validate', new Error('Cookie 数据未通过校验'), key);
          return fallback;
        }
        return value as TSchema[typeof key];
      } catch (error) {
        reportError('deserialize', error, key);
        return fallback;
      }
    },
    set(key, value, attributes = {}) {
      const name = `${prefix}${key}`;
      try {
        const codec = options.codecs?.[key] as
          | CookieCodec<TSchema[typeof key]>
          | undefined;
        const serializedValue = (codec ?? jsonCodec).encode(value);
        return writeRaw(
          key,
          serializedValue,
          resolveAttributes(attributes),
          'write',
        );
      } catch (error) {
        reportError('serialize', error, key);
        return { ok: false, name };
      }
    },
    has(key) {
      return readRaw(key) !== undefined;
    },
    remove(key, attributes = {}) {
      return writeRaw(
        key,
        '',
        resolveAttributes({
          ...attributes,
          expires: new Date(0),
          maxAgeSeconds: 0,
        }),
        'remove',
      );
    },
  };
}
