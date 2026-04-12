# Nest Ioredis 模块

基于 [ioredis](https://github.com/redis/ioredis) 的 Nest 可配置模块，支持**单机**、**URL**、**Sentinel**、**Redis Cluster** 四种连接形态。

## 连接形态一览

| `type`（可省略） | 判定条件（省略 `type` 时的优先级） | 关键配置 |
|------------------|-------------------------------------|----------|
| `standalone` | 默认 | `host` / `port` 等常规 `RedisOptions` |
| `url` | 配置了 `url` | `url`（如 `redis://:pass@127.0.0.1:6379/0`），第二参数为其余 `RedisOptions`（已去掉 `host`/`port`/`path`/`sentinels`/`name` 避免冲突） |
| `sentinel` | 配置了 `sentinels` 且配置了 `name` | 与 ioredis 文档一致，内部仍为 `new Redis(options)` |
| `cluster` | 配置了非空的 `clusterStartupNodes` | `clusterStartupNodes` + 可选 `clusterOptions`（含 `redisOptions` 作用于各节点连接） |

可通过 **`type`** 强制指定形态（例如仅探测 Sentinel 却暂时不想走 sentinel 时）。

## 在 AppModule 中注册

模块类名为 **`NestIoredisModule`**。是否全局由 **`forRoot` / `forRootAsync` 第二参数** `{ isGlobal?: boolean }` 控制，默认 **`true`**。

### 单机

```typescript
NestIoredisModule.forRoot({
  host: '127.0.0.1',
  port: 6379,
  password: 'secret',
  db: 0,
  keyPrefix: 'app:',
});
```

### URL

```typescript
NestIoredisModule.forRoot({
  type: 'url',
  url: process.env.REDIS_URL!, // redis://:pass@host:6379/0
  keyPrefix: 'app:',
});
```

### Sentinel

```typescript
NestIoredisModule.forRoot({
  sentinels: [
    { host: '10.0.0.1', port: 26379 },
    { host: '10.0.0.2', port: 26379 },
  ],
  name: 'mymaster',
  password: 'redis-auth',
  db: 0,
});
```

### Redis Cluster

```typescript
NestIoredisModule.forRoot({
  clusterStartupNodes: [
    { host: '127.0.0.1', port: 7000 },
    { host: '127.0.0.1', port: 7001 },
  ],
  clusterOptions: {
    scaleReads: 'slave',
    redisOptions: { password: 'cluster-node-pass' },
  },
});
```

### 异步注册（推荐）

```typescript
NestIoredisModule.forRootAsync({
  useFactory: (config: ConfigService) => ({
    ...config.get('redis'),
  }),
  inject: [ConfigService],
});
```

## 使用 IoredisService

注入 **`IoredisService`** 后，封装方法与 **`getClient()`** 均可使用。

- **`getClient()`**：单机返回 **`Redis`**，Cluster 模式返回 **`Cluster`**，可调用 `pipeline`、`publish`、Cluster 专有 **`nodes('master')`** 等。
- **`isConnected()`**：状态为 **`ready`** 时为 true；若使用 **`lazyConnect: true`**，在首次命令前可能长期为 false。

更多命令见 [ioredis 文档](https://github.com/redis/ioredis/blob/main/README.md)。

## 环境变量示例（按需映射到 forRoot）

```env
# 单机
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# 或仅 URL
REDIS_URL=redis://127.0.0.1:6379/0

# Sentinel（需在代码里拆成 sentinels 数组 + name）
REDIS_SENTINEL_MASTER=mymaster

# Cluster（需在代码里配置 clusterStartupNodes 数组）
```

## 注意事项

1. **`isGlobal`** 写在 **`IoredisModuleOptions` 根上**（与 ioredis 无关），不会传给底层 Redis 构造器。
2. **Cluster** 下请勿依赖单机 `host`/`port` 表达集群入口，应使用 **`clusterStartupNodes`**；节点级认证放在 **`clusterOptions.redisOptions`**。
3. **URL** 与 **Sentinel / 单机 host** 不要混在同一套配置里语义不清；请选一种并必要时用 **`type`** 固定。
4. 模块销毁时会调用 **`quit()`** 优雅断开。

## 扩展阅读

- [ioredis Sentinel](https://github.com/redis/ioredis#sentinel)
- [ioredis Cluster](https://github.com/redis/ioredis#cluster)
