import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit, Optional } from '@nestjs/common';
import Redis, { Cluster } from 'ioredis';
import { EventEmitter } from 'node:events';
import { connectionSummary, createIoredisClient, inferConnectionType } from './ioredis-connection.factory';
import type { IoredisModuleOptions } from './ioredis.interface';
import { MODULE_OPTIONS_TOKEN } from './ioredis.module-definition';

type RedisLikeClient = Redis | Cluster;

@Injectable()
export class IoredisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IoredisService.name);
  private client: RedisLikeClient | null = null;

  constructor(
    @Inject(MODULE_OPTIONS_TOKEN)
    @Optional()
    private readonly options?: IoredisModuleOptions,
  ) {}

  onModuleInit() {
    const opts = this.options ?? {};
    try {
      const mode = inferConnectionType(opts);
      this.client = createIoredisClient(opts);
      this.bindConnectionEvents(this.client);

      if (!opts.lazyConnect) {
        this.logger.log(`Redis 已初始化 (${mode}) ${connectionSummary(opts, mode)}`);
      }
    } catch (error) {
      this.logger.error(`Redis 初始化失败: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  private bindConnectionEvents(client: RedisLikeClient) {
    const ee = client as unknown as EventEmitter;
    ee.on('connect', () => {
      this.logger.log('Redis connect');
    });
    ee.on('ready', () => {
      this.logger.log('Redis ready');
    });
    ee.on('error', (error: Error) => {
      this.logger.error(`Redis error: ${error.message}`);
    });
    ee.on('close', () => {
      this.logger.warn('Redis connection closed');
    });
    ee.on('reconnecting', (delay: number) => {
      this.logger.warn(`Redis reconnecting in ${delay}ms`);
    });
  }

  async onModuleDestroy() {
    if (this.client) {
      try {
        await this.client.quit();
        this.logger.log('Redis 已断开');
      } catch (error) {
        this.logger.error(`Redis 断开失败: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        this.client = null;
      }
    }
  }

  /** 获取底层 ioredis 客户端（单机为 `Redis`，Cluster 为 `Cluster`） */
  getClient(): RedisLikeClient {
    if (!this.client) {
      throw new Error('Redis 客户端未初始化');
    }
    return this.client;
  }

  /** 单机为 `ready`；Cluster 在槽位就绪后亦为 `ready`；`lazyConnect` 在首次命令前可能非 ready */
  isConnected(): boolean {
    return this.client?.status === 'ready';
  }

  async set(key: string, value: string, expirySeconds?: number): Promise<'OK' | null> {
    const client = this.getClient();
    if (expirySeconds) {
      return await client.setex(key, expirySeconds, value);
    }
    return await client.set(key, value);
  }

  async get(key: string): Promise<string | null> {
    const client = this.getClient();
    return await client.get(key);
  }

  async del(...keys: string[]): Promise<number> {
    const client = this.getClient();
    return await client.del(...keys);
  }

  async exists(key: string): Promise<number> {
    const client = this.getClient();
    return await client.exists(key);
  }

  async expire(key: string, seconds: number): Promise<number> {
    const client = this.getClient();
    return await client.expire(key, seconds);
  }

  async ttl(key: string): Promise<number> {
    const client = this.getClient();
    return await client.ttl(key);
  }

  async hset(key: string, field: string, value: string): Promise<number> {
    const client = this.getClient();
    return await client.hset(key, field, value);
  }

  async hget(key: string, field: string): Promise<string | null> {
    const client = this.getClient();
    return await client.hget(key, field);
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    const client = this.getClient();
    return await client.hgetall(key);
  }

  async hdel(key: string, ...fields: string[]): Promise<number> {
    const client = this.getClient();
    return await client.hdel(key, ...fields);
  }

  async lpush(key: string, ...values: (string | number)[]): Promise<number> {
    const client = this.getClient();
    return await client.lpush(key, ...values);
  }

  async rpush(key: string, ...values: (string | number)[]): Promise<number> {
    const client = this.getClient();
    return await client.rpush(key, ...values);
  }

  async lpop(key: string): Promise<string | null> {
    const client = this.getClient();
    return await client.lpop(key);
  }

  async rpop(key: string): Promise<string | null> {
    const client = this.getClient();
    return await client.rpop(key);
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    const client = this.getClient();
    return await client.lrange(key, start, stop);
  }

  async sadd(key: string, ...members: (string | number)[]): Promise<number> {
    const client = this.getClient();
    return await client.sadd(key, ...members);
  }

  async srem(key: string, ...members: (string | number)[]): Promise<number> {
    const client = this.getClient();
    return await client.srem(key, ...members);
  }

  async smembers(key: string): Promise<string[]> {
    const client = this.getClient();
    return await client.smembers(key);
  }

  async sismember(key: string, member: string): Promise<number> {
    const client = this.getClient();
    return await client.sismember(key, member);
  }

  async zadd(key: string, score: number, member: string): Promise<number> {
    const client = this.getClient();
    return await client.zadd(key, score, member);
  }

  async zscore(key: string, member: string): Promise<string | null> {
    const client = this.getClient();
    return await client.zscore(key, member);
  }

  async zrange(key: string, start: number, stop: number, withScores = false): Promise<string[]> {
    const client = this.getClient();
    if (withScores) {
      return await client.zrange(key, start, stop, 'WITHSCORES');
    }
    return await client.zrange(key, start, stop);
  }

  async incr(key: string, increment = 1): Promise<number> {
    const client = this.getClient();
    if (increment === 1) {
      return await client.incr(key);
    }
    return await client.incrby(key, increment);
  }

  async decr(key: string, decrement = 1): Promise<number> {
    const client = this.getClient();
    if (decrement === 1) {
      return await client.decr(key);
    }
    return await client.decrby(key, decrement);
  }
}
