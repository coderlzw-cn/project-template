import type { ClientOptions } from '@influxdata/influxdb3-client';

/** InfluxDB 3 客户端及默认数据库配置。 */
export interface InfluxdbModuleOptions extends Omit<ClientOptions, 'host' | 'token' | 'database'> {
  /** InfluxDB 3 服务地址，例如 http://localhost:8181。 */
  host: string;
  /** 具有目标 database 读写权限的 API Token。 */
  token: string;
  /** 默认写入和查询的 database；InfluxDB 3 中对应原来的 bucket 概念。 */
  database: string;
  /** 是否输出封装层的操作日志，默认关闭。 */
  logging?: boolean;
  /** Core 管理 API 使用的管理员 Token；省略时复用 token。 */
  adminToken?: string;
  /** Core 管理 API 请求超时，单位毫秒，默认 10000。 */
  coreApiTimeout?: number;
  /** queryRows 默认允许收集的最大行数，默认 10000。 */
  maxQueryRows?: number;
}
