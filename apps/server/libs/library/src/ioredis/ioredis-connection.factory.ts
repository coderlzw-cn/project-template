import Redis, { Cluster, type ClusterOptions, type RedisOptions } from 'ioredis';
import type { IoredisConnectionType, IoredisModuleOptions } from './ioredis.interface';

/** 从配置推断连接形态（与 README 表格一致） */
export function inferConnectionType(options: IoredisModuleOptions): IoredisConnectionType {
  if (options.type) {
    return options.type;
  }
  if (options.clusterStartupNodes && options.clusterStartupNodes.length > 0) {
    return 'cluster';
  }
  if (options.url) {
    return 'url';
  }
  const sentinels = options.sentinels;
  if (Array.isArray(sentinels) && sentinels.length > 0 && options.name) {
    return 'sentinel';
  }
  return 'standalone';
}

/** 去掉 Nest 扩展字段，得到可交给 ioredis 的选项主体 */
function stripNestExtensions(options: IoredisModuleOptions): RedisOptions {
  const { type: _t, url: _u, clusterStartupNodes: _n, clusterOptions: _c, ...rest } = options;
  return rest;
}

/**
 * 单机 / Sentinel 共用的 `new Redis(options)` 合并逻辑。
 * Sentinel 时由 ioredis 根据 `sentinels` + `name` 选主，勿与 `url` / `clusterStartupNodes` 混用。
 */
function buildStandaloneOrSentinelOptions(rest: RedisOptions): RedisOptions {
  return {
    host: rest.host ?? '127.0.0.1',
    port: rest.port ?? 6379,
    password: rest.password,
    db: rest.db ?? 0,
    keyPrefix: rest.keyPrefix,
    retryStrategy: rest.retryStrategy,
    maxRetriesPerRequest: rest.maxRetriesPerRequest,
    connectTimeout: rest.connectTimeout ?? 10000,
    lazyConnect: rest.lazyConnect ?? false,
    ...rest,
  };
}

/** Cluster 子连接不应再带 host/port/path/sentinels/name，避免与槽位发现混淆 */
function redisOptionsForClusterNodes(rest: RedisOptions): ClusterOptions['redisOptions'] {
  const { host: _h, port: _p, path: _path, sentinels: _s, name: _n, ...forNodes } = rest;
  return forNodes as ClusterOptions['redisOptions'];
}

export function createIoredisClient(options: IoredisModuleOptions): Redis | Cluster {
  const mode = inferConnectionType(options);
  const rest = stripNestExtensions(options);

  switch (mode) {
    case 'cluster': {
      const nodes = options.clusterStartupNodes;
      if (!nodes?.length) {
        throw new Error('Cluster 模式需要非空的 clusterStartupNodes，例如 [{ host: "127.0.0.1", port: 7000 }]');
      }
      const clusterOpts: ClusterOptions = {
        ...options.clusterOptions,
        redisOptions: {
          connectTimeout: rest.connectTimeout ?? 10000,
          lazyConnect: rest.lazyConnect ?? false,
          password: rest.password,
          username: rest.username,
          keyPrefix: rest.keyPrefix,
          ...redisOptionsForClusterNodes(rest),
          ...options.clusterOptions?.redisOptions,
        },
      };
      return new Cluster(nodes, clusterOpts);
    }
    case 'url': {
      const url = options.url;
      if (!url?.trim()) {
        throw new Error('URL 模式需要配置 url，例如 redis://:password@127.0.0.1:6379/0');
      }
      const { host: _h, port: _p, path: _path, sentinels: _s, name: _n, ...secondArg } = rest;
      return new Redis(url, {
        connectTimeout: rest.connectTimeout ?? 10000,
        lazyConnect: rest.lazyConnect ?? false,
        ...secondArg,
      } as RedisOptions);
    }
    case 'sentinel':
    case 'standalone':
      return new Redis(buildStandaloneOrSentinelOptions(rest));
    default: {
      const _never: never = mode;
      throw new Error(`未知连接类型: ${_never as string}`);
    }
  }
}

export function connectionSummary(options: IoredisModuleOptions, mode: IoredisConnectionType): string {
  switch (mode) {
    case 'url':
      return `url=${options.url ? '[configured]' : 'missing'}`;
    case 'cluster': {
      const n = options.clusterStartupNodes?.length ?? 0;
      return `cluster nodes=${n}`;
    }
    case 'sentinel':
      return `sentinel name=${options.name ?? '?'} sentinels=${options.sentinels?.length ?? 0}`;
    case 'standalone':
    default:
      return `standalone ${options.host ?? '127.0.0.1'}:${options.port ?? 6379}`;
  }
}
