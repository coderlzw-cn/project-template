# Ioredis 模块

基于 ioredis 实现的 Redis 客户端模块，提供完整的 Redis 操作封装。

## 功能特性

- ✅ 基于 ioredis 5.x
- ✅ 使用 ConfigurableModuleBuilder 构建
- ✅ 支持全局模块
- ✅ 自动连接管理
- ✅ 完整的 Redis 操作封装
  - 字符串操作（set, get, del）
  - 哈希表操作（hset, hget, hgetall, hdel）
  - 列表操作（lpush, rpush, lpop, rpop, lrange）
  - 集合操作（sadd, srem, smembers, sismember）
  - 有序集合操作（zadd, zscore, zrange）
  - 原子操作（incr, decr）
- ✅ 连接状态监听
- ✅ 优雅关闭

## 使用方法

### 1. 在 AppModule 中导入

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { IoredisModule } from '@app/shared/ioredis';
import { ioredisConfig } from '../config/app.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [ioredisConfig],
    }),
    // 方式一：使用 forRoot（同步配置）
    IoredisModule.forRoot({
      host: '127.0.0.1',
      port: 6379,
      password: 'your-password',
      db: 0,
      keyPrefix: 'app:',
      connectTimeout: 10000,
      lazyConnect: false,
    }),
    // 方式二：使用 forRootAsync（推荐，从配置读取）
    IoredisModule.forRootAsync({
      useFactory: (configService: ConfigService) => {
        const redis = configService.get('ioredis');
        return {
          host: redis.host,
          port: redis.port,
          password: redis.password,
          db: redis.db,
          keyPrefix: redis.keyPrefix,
          connectTimeout: redis.connectTimeout,
          lazyConnect: redis.lazyConnect,
        };
      },
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

### 2. 在服务中使用 IoredisService

```typescript
import { Injectable } from '@nestjs/common';
import { IoredisService } from '@app/shared/ioredis';

@Injectable()
export class MyService {
  constructor(private readonly redisService: IoredisService) {}

  async example() {
    // 字符串操作
    await this.redisService.set('key', 'value', 3600); // 设置值，1小时过期
    const value = await this.redisService.get('key');
    await this.redisService.del('key');

    // 哈希表操作
    await this.redisService.hset('user:1', 'name', 'John');
    await this.redisService.hset('user:1', 'age', '30');
    const user = await this.redisService.hgetall('user:1');
    const name = await this.redisService.hget('user:1', 'name');

    // 列表操作
    await this.redisService.lpush('list', 'item1', 'item2');
    await this.redisService.rpush('list', 'item3');
    const items = await this.redisService.lrange('list', 0, -1);
    const first = await this.redisService.lpop('list');

    // 集合操作
    await this.redisService.sadd('set', 'member1', 'member2');
    const members = await this.redisService.smembers('set');
    const exists = await this.redisService.sismember('set', 'member1');

    // 有序集合操作
    await this.redisService.zadd('leaderboard', 100, 'player1');
    await this.redisService.zadd('leaderboard', 200, 'player2');
    const topPlayers = await this.redisService.zrange('leaderboard', 0, 9, true);

    // 原子操作
    await this.redisService.incr('counter');
    await this.redisService.incr('counter', 5);
    await this.redisService.decr('counter');

    // 获取原始客户端（用于高级操作）
    const client = this.redisService.getClient();
    await client.publish('channel', 'message');
  }
}
```

### 3. 获取原始 ioredis 客户端

如果需要使用 ioredis 的高级功能，可以获取原始客户端：

```typescript
const client = this.redisService.getClient();
// 使用 ioredis 的所有功能
await client.pipeline()
  .set('key1', 'value1')
  .set('key2', 'value2')
  .exec();
```

## 环境变量配置

```env
# Redis 服务器配置
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=your-password
REDIS_DB=0
REDIS_KEY_PREFIX=app:

# 连接配置
REDIS_CONNECT_TIMEOUT=10000
REDIS_LAZY_CONNECT=false
REDIS_MAX_RETRIES_PER_REQUEST=3
```

## API 说明

### IoredisService 方法

#### 基础操作
- `getClient()`: 获取原始 ioredis 客户端
- `isConnected()`: 检查客户端是否已连接

#### 字符串操作
- `set(key, value, expirySeconds?)`: 设置键值对，可选过期时间
- `get(key)`: 获取值
- `del(...keys)`: 删除键
- `exists(key)`: 检查键是否存在
- `expire(key, seconds)`: 设置过期时间
- `ttl(key)`: 获取剩余过期时间

#### 哈希表操作
- `hset(key, field, value)`: 设置哈希表字段
- `hget(key, field)`: 获取哈希表字段值
- `hgetall(key)`: 获取哈希表所有字段和值
- `hdel(key, ...fields)`: 删除哈希表字段

#### 列表操作
- `lpush(key, ...values)`: 列表左推入
- `rpush(key, ...values)`: 列表右推入
- `lpop(key)`: 列表左弹出
- `rpop(key)`: 列表右弹出
- `lrange(key, start, stop)`: 获取列表范围

#### 集合操作
- `sadd(key, ...members)`: 集合添加成员
- `srem(key, ...members)`: 集合移除成员
- `smembers(key)`: 获取集合所有成员
- `sismember(key, member)`: 检查成员是否在集合中

#### 有序集合操作
- `zadd(key, score, member)`: 有序集合添加成员
- `zscore(key, member)`: 获取成员分数
- `zrange(key, start, stop, withScores?)`: 获取有序集合范围

#### 原子操作
- `incr(key, increment?)`: 增加键的值
- `decr(key, decrement?)`: 减少键的值

## 注意事项

1. 模块默认是全局的，可以在任何地方注入 `IoredisService` 使用
2. 连接会在模块初始化时自动建立
3. 连接会在模块销毁时自动关闭
4. 支持所有 ioredis 的配置选项
5. 可以通过 `getClient()` 获取原始客户端进行高级操作
