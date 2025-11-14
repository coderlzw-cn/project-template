import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Inject, Optional } from '@nestjs/common';
import Redis, { type RedisOptions } from 'ioredis';
import type { IoredisModuleOptions } from './ioredis.interface';
import { MODULE_OPTIONS_TOKEN } from './ioredis.module-definition';

@Injectable()
export class IoredisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IoredisService.name);
  private client: Redis | null = null;

  constructor(@Inject(MODULE_OPTIONS_TOKEN) @Optional() private readonly options?: IoredisModuleOptions) {}

  onModuleInit() {
    try {
      const redisOptions: RedisOptions = {
        host: this.options?.host ?? '127.0.0.1',
        port: this.options?.port ?? 6379,
        password: this.options?.password,
        db: this.options?.db ?? 0,
        keyPrefix: this.options?.keyPrefix,
        retryStrategy: this.options?.retryStrategy,
        maxRetriesPerRequest: this.options?.maxRetriesPerRequest,
        connectTimeout: this.options?.connectTimeout ?? 10000,
        lazyConnect: this.options?.lazyConnect ?? false,
        ...this.options,
      };

      this.client = new Redis(redisOptions);

      // 监听连接事件
      this.client.on('connect', () => {
        this.logger.log('Redis client connected');
      });

      this.client.on('ready', () => {
        this.logger.log('Redis client ready');
      });

      this.client.on('error', (error) => {
        this.logger.error(`Redis client error: ${error.message}`);
      });

      this.client.on('close', () => {
        this.logger.warn('Redis client connection closed');
      });

      this.client.on('reconnecting', (delay: number) => {
        this.logger.warn(`Redis client reconnecting in ${delay}ms`);
      });

      if (!redisOptions.lazyConnect) {
        this.logger.log(`Redis client initialized: ${redisOptions.host}:${redisOptions.port}`);
      }
    } catch (error) {
      this.logger.error(`Failed to initialize Redis client: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      try {
        await this.client.quit();
        this.logger.log('Redis client disconnected');
      } catch (error) {
        this.logger.error(`Failed to disconnect Redis client: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        this.client = null;
      }
    }
  }

  /**
   * 获取 Redis 客户端实例
   */
  getClient(): Redis {
    if (!this.client) {
      throw new Error('Redis client is not initialized');
    }
    return this.client;
  }

  /**
   * 检查 Redis 客户端是否已连接
   */
  isConnected(): boolean {
    return this.client?.status === 'ready';
  }

  /**
   * 设置键值对
   * @param key 键
   * @param value 值
   * @param expirySeconds 过期时间（秒），可选
   */
  async set(key: string, value: string, expirySeconds?: number): Promise<'OK' | null> {
    const client = this.getClient();
    if (expirySeconds) {
      return await client.setex(key, expirySeconds, value);
    }
    return await client.set(key, value);
  }

  /**
   * 获取值
   * @param key 键
   */
  async get(key: string): Promise<string | null> {
    const client = this.getClient();
    return await client.get(key);
  }

  /**
   * 删除键
   * @param keys 键（可以是多个）
   */
  async del(...keys: string[]): Promise<number> {
    const client = this.getClient();
    return await client.del(...keys);
  }

  /**
   * 检查键是否存在
   * @param key 键
   */
  async exists(key: string): Promise<number> {
    const client = this.getClient();
    return await client.exists(key);
  }

  /**
   * 设置键的过期时间
   * @param key 键
   * @param seconds 过期时间（秒）
   */
  async expire(key: string, seconds: number): Promise<number> {
    const client = this.getClient();
    return await client.expire(key, seconds);
  }

  /**
   * 获取键的剩余过期时间
   * @param key 键
   */
  async ttl(key: string): Promise<number> {
    const client = this.getClient();
    return await client.ttl(key);
  }

  /**
   * 设置哈希表字段
   * @param key 键
   * @param field 字段
   * @param value 值
   */
  async hset(key: string, field: string, value: string): Promise<number> {
    const client = this.getClient();
    return await client.hset(key, field, value);
  }

  /**
   * 获取哈希表字段值
   * @param key 键
   * @param field 字段
   */
  async hget(key: string, field: string): Promise<string | null> {
    const client = this.getClient();
    return await client.hget(key, field);
  }

  /**
   * 获取哈希表所有字段和值
   * @param key 键
   */
  async hgetall(key: string): Promise<Record<string, string>> {
    const client = this.getClient();
    return await client.hgetall(key);
  }

  /**
   * 删除哈希表字段
   * @param key 键
   * @param fields 字段（可以是多个）
   */
  async hdel(key: string, ...fields: string[]): Promise<number> {
    const client = this.getClient();
    return await client.hdel(key, ...fields);
  }

  /**
   * 列表左推入
   * @param key 键
   * @param values 值（可以是多个）
   */
  async lpush(key: string, ...values: (string | number)[]): Promise<number> {
    const client = this.getClient();
    return await client.lpush(key, ...values);
  }

  /**
   * 列表右推入
   * @param key 键
   * @param values 值（可以是多个）
   */
  async rpush(key: string, ...values: (string | number)[]): Promise<number> {
    const client = this.getClient();
    return await client.rpush(key, ...values);
  }

  /**
   * 列表左弹出
   * @param key 键
   */
  async lpop(key: string): Promise<string | null> {
    const client = this.getClient();
    return await client.lpop(key);
  }

  /**
   * 列表右弹出
   * @param key 键
   */
  async rpop(key: string): Promise<string | null> {
    const client = this.getClient();
    return await client.rpop(key);
  }

  /**
   * 获取列表范围
   * @param key 键
   * @param start 起始索引
   * @param stop 结束索引
   */
  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    const client = this.getClient();
    return await client.lrange(key, start, stop);
  }

  /**
   * 集合添加成员
   * @param key 键
   * @param members 成员（可以是多个）
   */
  async sadd(key: string, ...members: (string | number)[]): Promise<number> {
    const client = this.getClient();
    return await client.sadd(key, ...members);
  }

  /**
   * 集合移除成员
   * @param key 键
   * @param members 成员（可以是多个）
   */
  async srem(key: string, ...members: (string | number)[]): Promise<number> {
    const client = this.getClient();
    return await client.srem(key, ...members);
  }

  /**
   * 获取集合所有成员
   * @param key 键
   */
  async smembers(key: string): Promise<string[]> {
    const client = this.getClient();
    return await client.smembers(key);
  }

  /**
   * 检查成员是否在集合中
   * @param key 键
   * @param member 成员
   */
  async sismember(key: string, member: string): Promise<number> {
    const client = this.getClient();
    return await client.sismember(key, member);
  }

  /**
   * 有序集合添加成员
   * @param key 键
   * @param score 分数
   * @param member 成员
   */
  async zadd(key: string, score: number, member: string): Promise<number> {
    const client = this.getClient();
    return await client.zadd(key, score, member);
  }

  /**
   * 获取有序集合成员分数
   * @param key 键
   * @param member 成员
   */
  async zscore(key: string, member: string): Promise<string | null> {
    const client = this.getClient();
    return await client.zscore(key, member);
  }

  /**
   * 获取有序集合范围（按分数排序）
   * @param key 键
   * @param start 起始索引
   * @param stop 结束索引
   * @param withScores 是否包含分数
   */
  async zrange(key: string, start: number, stop: number, withScores = false): Promise<string[]> {
    const client = this.getClient();
    if (withScores) {
      return await client.zrange(key, start, stop, 'WITHSCORES');
    }
    return await client.zrange(key, start, stop);
  }

  /**
   * 增加键的值（原子操作）
   * @param key 键
   * @param increment 增量，默认为 1
   */
  async incr(key: string, increment = 1): Promise<number> {
    const client = this.getClient();
    if (increment === 1) {
      return await client.incr(key);
    }
    return await client.incrby(key, increment);
  }

  /**
   * 减少键的值（原子操作）
   * @param key 键
   * @param decrement 减量，默认为 1
   */
  async decr(key: string, decrement = 1): Promise<number> {
    const client = this.getClient();
    if (decrement === 1) {
      return await client.decr(key);
    }
    return await client.decrby(key, decrement);
  }
}
