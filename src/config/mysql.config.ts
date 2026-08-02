import { getEnvStr } from '@/utils/env';
import { registerAs } from '@nestjs/config';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

export type MysqlConfig = ConstructorParameters<typeof PrismaMariaDb>[0];
const parseDatabaseUrl = (databaseUrl: string): Record<string, any> => {
  let url: URL;

  try {
    url = new URL(databaseUrl);
  } catch {
    throw new Error('DATABASE_URL 不是有效的 MySQL 连接地址');
  }

  if (url.protocol !== 'mysql:') {
    throw new Error('DATABASE_URL 必须使用 mysql:// 协议');
  }

  const database = decodeURIComponent(url.pathname.slice(1));

  if (!url.hostname || !url.username || !database) {
    throw new Error('DATABASE_URL 必须包含主机、用户名和数据库名');
  }

  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database,
    connectionLimit: 10,
    connectTimeout: 10000, // 建连超时（TCP+握手），默认只有 1000ms，高延迟下最容易先炸的就是它
    acquireTimeout: 1, // 从连接池拿到连接的超时，默认 10000ms，应 > connectTimeout
    queryTimeout: 15000, // 服务器端语句执行上限，仅 MariaDB 生效
    socketTimeout: 60000, // 请求发出后 socket 无数据的超时，兜底网络挂死的情况
    idleTimeout: 30, // 注意单位是秒！让池子先回收空闲连接，避免被 socketTimeout 误杀
  } satisfies MysqlConfig;
};

export const mysqlConfig = registerAs('mysql', () => {
  const databaseUrl = getEnvStr('DATABASE_URL');

  if (!databaseUrl) {
    throw new Error('缺少 DATABASE_URL 环境变量');
  }

  return parseDatabaseUrl(databaseUrl);
});
