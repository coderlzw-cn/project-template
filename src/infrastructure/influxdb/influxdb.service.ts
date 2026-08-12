import { InfluxDBClient, PartialWriteError, type PointValues, type QueryOptions, type WritableData, type WriteOptions } from '@influxdata/influxdb3-client';
import { Inject, Injectable, Logger, type OnApplicationShutdown } from '@nestjs/common';
import type { InfluxdbModuleOptions } from './influxdb.interfaces';
import { INFLUXDB_MODULE_OPTIONS } from './influxdb.module-definition';

export interface CreateDatabaseOptions {
  /** 数据保留期，例如 30d、24h；省略表示无限保留。 */
  retentionPeriod?: string;
}

export interface DeleteDatabaseOptions {
  /** 仅删除数据，保留数据库级资源。 */
  dataOnly?: boolean;
  /** 与 dataOnly 配合使用，同时删除表级资源。 */
  removeTables?: boolean;
  /** ISO 8601 时间，或 now、never、default。 */
  hardDeleteAt?: string;
}

export interface ClearTableOptions {
  /** ISO 8601 时间，或 now、never、default。 */
  hardDeleteAt?: string;
}

export interface DeleteTableOptions {
  /** ISO 8601 时间，或 now、never、default。 */
  hardDeleteAt?: string;
}

export interface InfluxdbDatabaseListResponse {
  databases: string[];
}

export interface QueryRowsOptions {
  /** 最多收集的行数，防止大结果集耗尽应用内存。 */
  maxRows?: number;
}

export class InfluxdbCoreApiError extends Error {
  constructor(
    readonly status: number,
    readonly responseBody: string,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = InfluxdbCoreApiError.name;
  }
}

export class InfluxdbQueryRowLimitError extends Error {
  constructor(readonly limit: number) {
    super(`InfluxDB 查询结果超过允许收集的最大行数：${limit}`);
    this.name = InfluxdbQueryRowLimitError.name;
  }
}

/**
 * 封装 InfluxDB 3 客户端，并默认使用模块配置的 database。
 * InfluxDB 3 写入是 Promise API，查询结果是 AsyncGenerator。
 */
@Injectable()
export class InfluxdbService implements OnApplicationShutdown {
  private readonly logger = new Logger(InfluxdbService.name);
  private readonly logging: boolean;
  private readonly coreApiTimeout: number;
  private readonly maxQueryRows: number;
  private closePromise?;
  readonly client: InfluxDBClient;

  constructor(@Inject(INFLUXDB_MODULE_OPTIONS) readonly options: Readonly<InfluxdbModuleOptions>) {
    const { logging = false, coreApiTimeout = 10_000, maxQueryRows = 10_000 } = options;
    this.validateOptions(options, coreApiTimeout, maxQueryRows);
    this.logging = logging;
    this.coreApiTimeout = coreApiTimeout;
    this.maxQueryRows = maxQueryRows;

    const clientOptions: InfluxdbModuleOptions = { ...options };
    delete clientOptions.logging;
    delete clientOptions.adminToken;
    delete clientOptions.coreApiTimeout;
    delete clientOptions.maxQueryRows;
    this.client = new InfluxDBClient(clientOptions);
    this.log(`InfluxDB 3 客户端初始化完成：host=${options.host}, database=${options.database}`);
  }

  /** 写入 Point、行协议字符串或其数组；默认写入模块配置的 database。 */
  async write(data: WritableData, database = this.options.database, writeOptions?: Partial<WriteOptions>) {
    try {
      await this.client.write(data, database, undefined, writeOptions);
      this.debug(`InfluxDB 写入成功：database=${database}`);
    } catch (error) {
      if (error instanceof PartialWriteError) {
        // 不记录 originalLine，避免行协议中的业务数据进入日志。
        const failures = error.lineErrors.map(({ lineNumber, errorMessage }) => `line=${lineNumber}: ${errorMessage}`).join('; ');
        this.error(`InfluxDB 部分写入失败：database=${database}, failedLines=${error.lineErrors.length}`, failures);
      } else {
        this.error(`InfluxDB 写入失败：database=${database}`, error);
      }
      throw error;
    }
  }

  /** 执行 SQL（默认）或 InfluxQL 查询，并以异步生成器逐行返回。 */
  async *query(query: string, database = this.options.database, queryOptions?: Partial<QueryOptions>): AsyncGenerator<Record<string, unknown>, void, void> {
    this.debug(`开始执行 InfluxDB 查询：database=${database}, type=${queryOptions?.type ?? 'sql'}`);
    let rowCount = 0;
    try {
      for await (const row of this.client.query(query, database, queryOptions)) {
        rowCount += 1;
        yield row;
      }
      this.debug(`InfluxDB 查询完成：database=${database}, rows=${rowCount}`);
    } catch (error) {
      this.error(`InfluxDB 查询失败：database=${database}, type=${queryOptions?.type ?? 'sql'}`, error);
      throw error;
    }
  }

  /** 执行查询并返回类型化的 PointValues 异步生成器。 */
  async *queryPoints(query: string, database = this.options.database, queryOptions?: Partial<QueryOptions>): AsyncGenerator<PointValues, void, void> {
    this.debug(`开始执行 InfluxDB Point 查询：database=${database}, type=${queryOptions?.type ?? 'sql'}`);
    let rowCount = 0;
    try {
      for await (const row of this.client.queryPoints(query, database, queryOptions)) {
        rowCount += 1;
        yield row;
      }
      this.debug(`InfluxDB Point 查询完成：database=${database}, rows=${rowCount}`);
    } catch (error) {
      this.error(`InfluxDB Point 查询失败：database=${database}, type=${queryOptions?.type ?? 'sql'}`, error);
      throw error;
    }
  }

  /** 执行查询并一次性收集数据；超过行数上限时抛出 InfluxdbQueryRowLimitError。 */
  async queryRows<T extends Record<string, unknown> = Record<string, unknown>>(
    query: string,
    database = this.options.database,
    queryOptions?: Partial<QueryOptions>,
    collectOptions: QueryRowsOptions = {},
  ): Promise<T[]> {
    const maxRows = collectOptions.maxRows ?? this.maxQueryRows;
    this.assertPositiveInteger(maxRows, 'maxRows');

    const rows: T[] = [];
    for await (const row of this.query(query, database, queryOptions)) {
      if (rows.length >= maxRows) throw new InfluxdbQueryRowLimitError(maxRows);
      rows.push(row as T);
    }
    return rows;
  }

  /** 获取 InfluxDB 服务端版本，可用于诊断和健康检查。 */
  async getServerVersion(): Promise<string | undefined> {
    return await this.client.getServerVersion();
  }

  /** 仅检查 InfluxDB 是否可访问，不向数据库写入数据。 */
  async isHealthy(): Promise<boolean> {
    try {
      await this.getServerVersion();
      return true;
    } catch (error) {
      this.error('InfluxDB 健康检查失败', error);
      return false;
    }
  }

  /** 获取当前 InfluxDB 3 Core 实例中的数据库列表。 */
  async listDatabases(): Promise<string[]> {
    const response = await this.requestCoreApi<InfluxdbDatabaseListResponse>('GET', '/api/v3/configure/database', undefined, {
      format: 'json',
    });
    if (!Array.isArray(response.databases) || !response.databases.every((database) => typeof database === 'string')) {
      throw new InfluxdbCoreApiError(200, JSON.stringify(response), 'InfluxDB 数据库列表响应格式错误');
    }
    return response.databases;
  }

  /** 使用管理员 Token 创建数据库。 */
  async createDatabase(database = this.options.database, options: CreateDatabaseOptions = {}) {
    const data = await this.requestCoreApi<unknown>('POST', '/api/v3/configure/database', {
      db: database,
      ...(options.retentionPeriod ? { retention_period: options.retentionPeriod } : {}),
    });
    this.log(`InfluxDB 数据库创建成功：database=${database}`);
    return data;
  }

  /**
   * 确保数据库存在。并发创建或数据库已存在时，Core 返回 409，此方法会将其视为成功。
   */
  async ensureDatabase(database = this.options.database, options: CreateDatabaseOptions = {}): Promise<boolean> {
    try {
      await this.createDatabase(database, options);
      return true;
    } catch (error) {
      if (error instanceof InfluxdbCoreApiError && error.status === 409) {
        this.debug(`InfluxDB 数据库已存在：database=${database}`);
        return false;
      }
      throw error;
    }
  }

  /** 更新数据库保留期。是否支持修改取决于 InfluxDB 3 Core 版本。 */
  async updateDatabaseRetentionPeriod(retentionPeriod: string, database = this.options.database) {
    const data = await this.requestCoreApi<unknown>('PUT', '/api/v3/configure/database', { retention_period: retentionPeriod }, { db: database });
    this.log(`InfluxDB 数据库保留期更新成功：database=${database}, retentionPeriod=${retentionPeriod}`);
    return data;
  }

  /** 移除数据库保留期，使数据无限期保留。 */
  async removeDatabaseRetentionPeriod(database = this.options.database) {
    await this.requestCoreApi<void>('DELETE', '/api/v3/configure/database/retention_period', undefined, { db: database });
    this.log(`InfluxDB 数据库保留期已移除：database=${database}`);
  }

  /** 删除数据库。该操作具有破坏性，调用方应自行进行权限和二次确认。 */
  async deleteDatabase(database = this.options.database, options: DeleteDatabaseOptions = {}) {
    await this.requestCoreApi<void>('DELETE', '/api/v3/configure/database', undefined, {
      db: database,
      ...(options.dataOnly !== undefined ? { data_only: String(options.dataOnly) } : {}),
      ...(options.removeTables !== undefined ? { remove_tables: String(options.removeTables) } : {}),
      ...(options.hardDeleteAt ? { hard_delete_at: options.hardDeleteAt } : {}),
    });
    this.warn(`InfluxDB 数据库删除请求成功：database=${database}`);
  }

  /** 清空表中的全部数据，并保留表结构及其关联资源。 */
  async clearTable(table: string, database = this.options.database, options: ClearTableOptions = {}) {
    await this.requestCoreApi<void>('DELETE', '/api/v3/configure/table', undefined, {
      db: database,
      table,
      data_only: 'true',
      ...(options.hardDeleteAt ? { hard_delete_at: options.hardDeleteAt } : {}),
    });
    this.warn(`InfluxDB 表数据清空请求成功：database=${database}, table=${table}`);
  }

  /** 删除整张表及其数据。该操作具有破坏性，调用方应自行进行权限和二次确认。 */
  async deleteTable(table: string, database = this.options.database, options: DeleteTableOptions = {}) {
    await this.requestCoreApi<void>('DELETE', '/api/v3/configure/table', undefined, {
      db: database,
      table,
      ...(options.hardDeleteAt ? { hard_delete_at: options.hardDeleteAt } : {}),
    });
    this.warn(`InfluxDB 表删除请求成功：database=${database}, table=${table}`);
  }

  private async requestCoreApi<T>(method: string, pathname: string, body?: object, query: Record<string, string> = {}): Promise<T> {
    const url = new URL(pathname, this.options.host.endsWith('/') ? this.options.host : `${this.options.host}/`);
    for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers: {
          ...this.options.headers,
          Authorization: `${this.options.authScheme ?? 'Bearer'} ${this.options.adminToken ?? this.options.token}`,
          Accept: 'application/json',
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        signal: AbortSignal.timeout(this.coreApiTimeout),
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    } catch (error) {
      const message = `InfluxDB Core API 请求失败：method=${method}, path=${pathname}`;
      this.error(message, error);
      throw new InfluxdbCoreApiError(0, '', message, { cause: error });
    }

    const responseBody = await response.text();
    if (!response.ok) {
      const message = `InfluxDB Core API 请求失败：method=${method}, path=${pathname}, status=${response.status}`;
      if (response.status === 409) this.debug(message);
      else this.error(message, `responseLength=${responseBody.length}`);
      throw new InfluxdbCoreApiError(response.status, responseBody, message);
    }

    if (!responseBody) return undefined as T;
    if (response.headers.get('content-type')?.includes('application/json')) {
      try {
        return JSON.parse(responseBody) as T;
      } catch (error) {
        const message = `InfluxDB Core API 响应不是有效 JSON：method=${method}, path=${pathname}, status=${response.status}`;
        this.error(message, error);
        throw new InfluxdbCoreApiError(response.status, responseBody, message, { cause: error });
      }
    }
    return responseBody as T;
  }

  /** 应用退出时关闭 HTTP/gRPC 连接资源。 */
  async onApplicationShutdown() {
    this.log('正在关闭 InfluxDB 3 客户端');
    try {
      await this.client.close();
      this.log('InfluxDB 3 客户端已关闭');
    } catch (error) {
      this.error('InfluxDB 3 客户端关闭失败', error);
    }
  }

  private validateOptions(options: Readonly<InfluxdbModuleOptions>, coreApiTimeout: number, maxQueryRows: number): void {
    this.assertNonEmptyString(options.host, 'host');
    const host = new URL(options.host);
    if (host.protocol !== 'http:' && host.protocol !== 'https:') {
      throw new TypeError('InfluxDB host 仅支持 http 或 https 协议');
    }
    this.assertNonEmptyString(options.token, 'token');
    this.assertNonEmptyString(options.database, 'database');
    if (options.adminToken !== undefined) this.assertNonEmptyString(options.adminToken, 'adminToken');
    this.assertPositiveInteger(coreApiTimeout, 'coreApiTimeout');
    this.assertPositiveInteger(maxQueryRows, 'maxQueryRows');
  }

  private assertNonEmptyString(value: unknown, name: string): asserts value is string {
    if (typeof value !== 'string' || !value.trim()) {
      throw new TypeError(`InfluxDB ${name} 不能为空`);
    }
  }

  private assertPositiveInteger(value: number, name: string): void {
    if (!Number.isInteger(value) || value <= 0) {
      throw new TypeError(`InfluxDB ${name} 必须是正整数`);
    }
  }

  private log(message: string): void {
    if (this.logging) this.logger.log(message);
  }

  private debug(message: string): void {
    if (this.logging) this.logger.debug(message);
  }

  private warn(message: string): void {
    if (this.logging) this.logger.warn(message);
  }

  private error(message: string, error: unknown): void {
    if (!this.logging) return;
    this.logger.error(message, error instanceof Error ? error.stack : String(error));
  }
}
