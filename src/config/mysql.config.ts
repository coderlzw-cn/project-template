import { registerAs } from '@nestjs/config';
import { getEnvStr } from '@/utils/env';

const parseDatabaseUrl = (databaseUrl: string) => {
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
  };
};

export const mysqlConfig = registerAs('mysql', () => {
  const databaseUrl = getEnvStr('DATABASE_URL');

  if (!databaseUrl) {
    throw new Error('缺少 DATABASE_URL 环境变量');
  }

  return parseDatabaseUrl(databaseUrl);
});
