import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '@/generated/prisma/client';
import { mysqlConfig } from '../../config/mysql.config';

@Injectable()
export class PrismaService extends PrismaClient {
  constructor(
    @Inject(mysqlConfig.KEY)
    config: ConfigType<typeof mysqlConfig>,
  ) {
    const adapter = new PrismaMariaDb(config);
    super({ adapter });
  }
}
