import { type Language, isSupportedLanguage } from '@/i18n/constants';
import {
  createStorage,
  type BrowserStorageKind,
  type StorageErrorContext,
  type StorageMigrationContext,
  type TypedStorage,
} from '@/utils/storage';

export interface AppStorageSchema {
  language: Language;
}

export interface AppStorageOptions {
  /**
   * 存储介质。默认 `local`；`session` 的数据仅在当前标签页会话内保留。
   * 也可传入解析函数，便于测试或接入受控的 Storage 实现。
   */
  storage?: BrowserStorageKind | (() => Storage | null);
  /** Key 前缀，最终格式为 `{namespace}::{key}`。默认 `demo`。 */
  namespace?: string;
  /**
   * 数据结构版本，默认 `1`。已存数据版本不同时会调用 `migrate`；未提供迁移函数则丢弃旧值。
   */
  version?: number;
  /** Web Storage 不可用时是否回退到页面内存，默认 `true`。 */
  fallbackToMemory?: boolean;
  /** 数据版本变化时的迁移函数；返回 `undefined` 表示丢弃该项。 */
  migrate?: (context: StorageMigrationContext) => unknown;
  /** 统一接收读取、写入、校验及迁移错误，回调异常不会影响存储主流程。 */
  onError?: (context: StorageErrorContext) => void;
  /** 自定义时钟，主要用于 TTL 相关测试。 */
  now?: () => number;
}

/**
 * 创建具有应用 schema 和运行时校验的 Storage 实例。
 *
 * @example
 * const checkoutStorage = createAppStorage({
 *   storage: "session",
 *   namespace: "demo-checkout",
 *   fallbackToMemory: false,
 *   onError: ({ operation, error }) => console.error(operation, error),
 * });
 *
 * checkoutStorage.set("language", "zh-CN", { ttlMs: 30 * 60 * 1000 });
 * const language = checkoutStorage.get("language", "zh-CN");
 * checkoutStorage.remove("language");
 */
export function createAppStorage(
  options: AppStorageOptions = {},
): TypedStorage<AppStorageSchema> {
  const {
    namespace = 'demo',
    version = 1,
    storage = 'local',
    ...storageOptions
  } = options;

  return createStorage<AppStorageSchema>({
    ...storageOptions,
    namespace,
    version,
    storage,
    validators: {
      language: isSupportedLanguage,
    },
  });
}

/** 跨浏览器会话持久化的应用存储，也是现有功能的默认实例。 */
export const appStorage = createAppStorage();

/**
 * 当前标签页会话级应用存储。页面刷新后仍存在，关闭标签页后由浏览器清理。
 *
 * @example
 * appSessionStorage.set("language", "en-US");
 * const language = appSessionStorage.get("language");
 */
export const appSessionStorage = createAppStorage({ storage: 'session' });
