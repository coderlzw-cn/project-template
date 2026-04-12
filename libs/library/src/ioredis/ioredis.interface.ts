import type { ClusterNode, ClusterOptions, RedisOptions } from 'ioredis';

/** Redis 连接形态（未设置 `type` 时按配置字段自动推断，见 README） */
export type IoredisConnectionType = 'standalone' | 'url' | 'sentinel' | 'cluster';

/**
 * Nest Ioredis 模块配置。
 * - **单机 / Sentinel**：与 ioredis `RedisOptions` 一致；Sentinel 需配置 `sentinels` + `name`。
 * - **URL**：配置 `url`（如 `redis://:pass@host:6379/0`），可与其它通用项共用。
 * - **Cluster**：配置 `clusterStartupNodes`，可选 `clusterOptions`。
 */
export interface IoredisModuleOptions extends RedisOptions {
  /** 显式指定连接形态；省略时按 `url` / `clusterStartupNodes` / `sentinels+name` 推断 */
  type?: IoredisConnectionType;
  /** `type: 'url'` 或省略 type 且本字段存在时使用，等价 `new Redis(url, options)` */
  url?: string;
  /** Cluster 起始节点，`type: 'cluster'` 或省略 type 且本数组非空时使用 */
  clusterStartupNodes?: ClusterNode[];
  /** 传给 `Redis.Cluster` 的选项（含 `redisOptions` 等） */
  clusterOptions?: ClusterOptions;
}
