export type BrowserStorageKind = 'local' | 'session';

export type StorageOperation =
  | 'resolve'
  | 'read'
  | 'write'
  | 'remove'
  | 'clear'
  | 'serialize'
  | 'deserialize'
  | 'validate'
  | 'migrate';

export interface StorageErrorContext {
  operation: StorageOperation;
  key?: string;
  error: unknown;
}

export interface StorageWriteResult {
  /** 数据已成功序列化，并写入浏览器存储或内存降级层。 */
  ok: boolean;
  /** true 表示已持久化；false 表示仅保存在当前页面的内存中。 */
  persisted: boolean;
}

export interface StorageSetOptions {
  /** 过期时间；不传表示永久有效。 */
  ttlMs?: number;
}

export type StorageValidator<T> = (value: unknown) => value is T;

export interface StorageMigrationContext {
  key: string;
  value: unknown;
  fromVersion: number;
  toVersion: number;
}

export interface CreateStorageOptions<TSchema extends object> {
  namespace: string;
  version?: number;
  storage?: BrowserStorageKind | (() => Storage | null);
  fallbackToMemory?: boolean;
  validators?: Partial<{ [K in keyof TSchema]: StorageValidator<TSchema[K]> }>;
  /** 返回 undefined 表示丢弃无法迁移的数据。 */
  migrate?: (context: StorageMigrationContext) => unknown;
  onError?: (context: StorageErrorContext) => void;
  now?: () => number;
}

export interface StorageChange<T> {
  source: 'local' | 'external';
  value: T | undefined;
}

export interface TypedStorage<TSchema extends object> {
  get<K extends Extract<keyof TSchema, string>>(key: K): TSchema[K] | undefined;
  get<K extends Extract<keyof TSchema, string>>(
    key: K,
    fallback: TSchema[K],
  ): TSchema[K];
  set<K extends Extract<keyof TSchema, string>>(
    key: K,
    value: TSchema[K],
    options?: StorageSetOptions,
  ): StorageWriteResult;
  has<K extends Extract<keyof TSchema, string>>(key: K): boolean;
  remove<K extends Extract<keyof TSchema, string>>(key: K): void;
  keys(): Array<Extract<keyof TSchema, string>>;
  clear(): void;
  subscribe<K extends Extract<keyof TSchema, string>>(
    key: K,
    listener: (change: StorageChange<TSchema[K]>) => void,
  ): () => void;
  destroy(): void;
}

interface StoredEnvelope {
  marker: 'typed-storage';
  version: number;
  createdAt: number;
  expiresAt: number | null;
  value: unknown;
}

const keySeparator = '::';

function isStoredEnvelope(value: unknown): value is StoredEnvelope {
  if (!value || typeof value !== 'object') return false;

  const envelope = value as Partial<StoredEnvelope>;
  return (
    envelope.marker === 'typed-storage' &&
    typeof envelope.version === 'number' &&
    typeof envelope.createdAt === 'number' &&
    (envelope.expiresAt === null || typeof envelope.expiresAt === 'number') &&
    Object.hasOwn(envelope, 'value')
  );
}

/**
 * 创建带 namespace、版本、TTL、校验及内存降级能力的类型安全 Web Storage。
 * Web Storage 对同源脚本可见，不应存放密码、令牌等敏感信息。
 */
export function createStorage<TSchema extends object>(
  options: CreateStorageOptions<TSchema>,
): TypedStorage<TSchema> {
  const namespace = options.namespace.trim();
  if (!namespace) throw new Error('storage namespace 不能为空');

  const version = options.version ?? 1;
  if (!Number.isInteger(version) || version < 1)
    throw new Error('storage version 必须是正整数');

  const prefix = `${namespace}${keySeparator}`;
  const now = options.now ?? Date.now;
  const fallbackToMemory = options.fallbackToMemory ?? true;
  const memory = new Map<string, string>();
  type SchemaKey = Extract<keyof TSchema, string>;
  type Listener = (change: StorageChange<TSchema[SchemaKey]>) => void;
  const listeners = new Map<SchemaKey, Set<Listener>>();
  let isStorageEventAttached = false;

  const reportError = (
    operation: StorageOperation,
    error: unknown,
    key?: string,
  ) => {
    try {
      options.onError?.({ operation, key, error });
    } catch {
      // 监控回调本身失败时不能影响存储主流程。
    }
  };

  const resolveStorage = () => {
    try {
      if (typeof options.storage === 'function') return options.storage();
      if (typeof window === 'undefined') return null;
      return options.storage === 'session'
        ? window.sessionStorage
        : window.localStorage;
    } catch (error) {
      reportError('resolve', error);
      return null;
    }
  };

  const toStorageKey = (key: SchemaKey) => `${prefix}${key}`;

  const fromStorageKey = (key: string) =>
    key.startsWith(prefix)
      ? (key.slice(prefix.length) as SchemaKey)
      : undefined;

  const readRaw = (storageKey: string) => {
    const storage = resolveStorage();
    if (storage) {
      try {
        const value = storage.getItem(storageKey);
        if (value !== null) return value;
      } catch (error) {
        reportError('read', error, storageKey);
      }
    }

    return fallbackToMemory ? (memory.get(storageKey) ?? null) : null;
  };

  const writeRaw = (storageKey: string, value: string): StorageWriteResult => {
    const storage = resolveStorage();
    if (storage) {
      try {
        storage.setItem(storageKey, value);
        memory.delete(storageKey);
        return { ok: true, persisted: true };
      } catch (error) {
        reportError('write', error, storageKey);
      }
    }

    if (!fallbackToMemory) return { ok: false, persisted: false };
    memory.set(storageKey, value);
    return { ok: true, persisted: false };
  };

  const removeRaw = (storageKey: string) => {
    const storage = resolveStorage();
    if (storage) {
      try {
        storage.removeItem(storageKey);
      } catch (error) {
        reportError('remove', error, storageKey);
      }
    }
    memory.delete(storageKey);
  };

  const emit = <K extends SchemaKey>(
    key: K,
    change: StorageChange<TSchema[K]>,
  ) => {
    const keyListeners = listeners.get(key);
    if (!keyListeners) return;

    for (const listener of keyListeners) {
      (listener as (nextChange: StorageChange<TSchema[K]>) => void)(change);
    }
  };

  const serializeAndWrite = <K extends SchemaKey>(
    key: K,
    value: TSchema[K],
    createdAt: number,
    expiresAt: number | null,
  ) => {
    let serialized: string;
    try {
      serialized = JSON.stringify({
        marker: 'typed-storage',
        version,
        createdAt,
        expiresAt,
        value,
      } satisfies StoredEnvelope);
    } catch (error) {
      reportError('serialize', error, toStorageKey(key));
      return { ok: false, persisted: false };
    }

    return writeRaw(toStorageKey(key), serialized);
  };

  const readValue = <K extends SchemaKey>(key: K): TSchema[K] | undefined => {
    const storageKey = toStorageKey(key);
    const raw = readRaw(storageKey);
    if (raw === null) return undefined;

    let envelope: StoredEnvelope;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!isStoredEnvelope(parsed)) throw new Error('存储数据格式无效');
      envelope = parsed;
    } catch (error) {
      reportError('deserialize', error, storageKey);
      removeRaw(storageKey);
      return undefined;
    }

    if (envelope.expiresAt !== null && envelope.expiresAt <= now()) {
      removeRaw(storageKey);
      return undefined;
    }

    let value = envelope.value;
    if (envelope.version !== version) {
      if (!options.migrate) {
        removeRaw(storageKey);
        return undefined;
      }

      try {
        value = options.migrate({
          key,
          value,
          fromVersion: envelope.version,
          toVersion: version,
        });
      } catch (error) {
        reportError('migrate', error, storageKey);
        removeRaw(storageKey);
        return undefined;
      }

      if (value === undefined) {
        removeRaw(storageKey);
        return undefined;
      }
    }

    const validator = options.validators?.[key] as
      | StorageValidator<TSchema[K]>
      | undefined;
    if (validator && !validator(value)) {
      reportError('validate', new Error('存储数据未通过校验'), storageKey);
      removeRaw(storageKey);
      return undefined;
    }

    if (envelope.version !== version) {
      serializeAndWrite(key, value as TSchema[K], now(), envelope.expiresAt);
    }

    return value as TSchema[K];
  };

  const getNamespaceKeys = () => {
    const namespaceKeys = new Set<SchemaKey>();
    const storage = resolveStorage();

    if (storage) {
      try {
        for (let index = 0; index < storage.length; index += 1) {
          const storageKey = storage.key(index);
          if (!storageKey) continue;
          const key = fromStorageKey(storageKey);
          if (key) namespaceKeys.add(key);
        }
      } catch (error) {
        reportError('read', error);
      }
    }

    for (const storageKey of memory.keys()) {
      const key = fromStorageKey(storageKey);
      if (key) namespaceKeys.add(key);
    }

    return [...namespaceKeys];
  };

  const handleStorageEvent = (event: StorageEvent) => {
    const storage = resolveStorage();
    if (event.storageArea && storage && event.storageArea !== storage) return;

    if (event.key === null) {
      for (const key of listeners.keys())
        emit(key, { source: 'external', value: readValue(key) });
      return;
    }

    const key = fromStorageKey(event.key);
    if (key && listeners.has(key))
      emit(key, { source: 'external', value: readValue(key) });
  };

  const attachStorageEvent = () => {
    if (isStorageEventAttached || typeof window === 'undefined') return;
    window.addEventListener('storage', handleStorageEvent);
    isStorageEventAttached = true;
  };

  const detachStorageEvent = () => {
    if (!isStorageEventAttached || typeof window === 'undefined') return;
    window.removeEventListener('storage', handleStorageEvent);
    isStorageEventAttached = false;
  };

  return {
    get(key, fallback?) {
      const value = readValue(key);
      return value === undefined ? fallback : value;
    },
    set(key, value, setOptions = {}) {
      if (value === undefined) {
        const error = new Error('不能存储 undefined，请使用 remove 删除数据');
        reportError('serialize', error, toStorageKey(key));
        return { ok: false, persisted: false };
      }

      const ttlMs = setOptions.ttlMs;
      if (ttlMs !== undefined && (!Number.isFinite(ttlMs) || ttlMs <= 0)) {
        const error = new Error('ttlMs 必须是正数');
        reportError('write', error, toStorageKey(key));
        return { ok: false, persisted: false };
      }

      const createdAt = now();
      const result = serializeAndWrite(
        key,
        value,
        createdAt,
        ttlMs === undefined ? null : createdAt + ttlMs,
      );
      if (result.ok) emit(key, { source: 'local', value });
      return result;
    },
    has(key) {
      return readValue(key) !== undefined;
    },
    remove(key) {
      removeRaw(toStorageKey(key));
      emit(key, { source: 'local', value: undefined });
    },
    keys() {
      return getNamespaceKeys().filter(key => readValue(key) !== undefined);
    },
    clear() {
      const keys = getNamespaceKeys();
      for (const key of keys) removeRaw(toStorageKey(key));
      for (const key of listeners.keys())
        emit(key, { source: 'local', value: undefined });
    },
    subscribe(key, listener) {
      const keyListeners = listeners.get(key) ?? new Set<Listener>();
      keyListeners.add(listener as Listener);
      listeners.set(key, keyListeners);
      attachStorageEvent();

      return () => {
        keyListeners.delete(listener as Listener);
        if (keyListeners.size === 0) listeners.delete(key);
        if (listeners.size === 0) detachStorageEvent();
      };
    },
    destroy() {
      listeners.clear();
      detachStorageEvent();
    },
  };
}
