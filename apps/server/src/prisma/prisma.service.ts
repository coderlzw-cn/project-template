import { Injectable } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { Logger } from '@nestjs/common';

@Injectable()
export class PrismaService extends PrismaClient {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? '' });
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('🎉 数据库连接成功');
  }
  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('数据库连接关闭');
  }
}
