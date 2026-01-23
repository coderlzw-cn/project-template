import type { RedisOptions } from 'ioredis';

/**
 * Redis 模块配置选项
 */
export interface IoredisModuleOptions extends RedisOptions {
  /** 是否全局模块 */
  isGlobal?: boolean;
}
