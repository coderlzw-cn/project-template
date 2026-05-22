import { Injectable, Logger } from '@nestjs/common';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '../generated/prisma/client';

@Injectable()
export class PrismaService extends PrismaClient {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const adapter = new PrismaBetterSqlite3({
      url: process.env.DATABASE_URL ?? '',
    });
    super({ adapter });
  }

  async onModuleInit() {
    this.logger.log('🎉 数据库连接成功');
  }
  async onModuleDestroy() {
    this.logger.log('数据库连接关闭');
  }
}
