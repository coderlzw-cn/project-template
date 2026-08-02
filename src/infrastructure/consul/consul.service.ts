import { Inject, Injectable, Logger, type OnApplicationBootstrap, type OnApplicationShutdown } from '@nestjs/common';
import { ConsulApiError, ConsulResponseError } from './consul.errors';
import type {
  ConsulAgentService,
  ConsulHealthServiceEntry,
  ConsulKvEntry,
  ConsulKvReadOptions,
  ConsulKvWriteOptions,
  ConsulModuleOptions,
  ConsulQueryMeta,
  ConsulQueryOptions,
  ConsulRequestOptions,
  ConsulResponse,
  ConsulScope,
  ConsulServiceRegistration,
  ConsulSession,
  ConsulSessionDefinition,
} from './consul.interfaces';
import { CONSUL_MODULE_OPTIONS } from './consul.module-definition';

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_RETRY_BASE_DELAY_MS = 200;
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

export interface ConsulAgentServicesOptions extends ConsulQueryOptions {
  filter?: string;
}

export interface ConsulServiceDiscoveryOptions extends ConsulQueryOptions {
  /** 只返回全部检查均 passing 的实例。 */
  passing?: boolean;
  /** 按单个服务标签过滤。 */
  tag?: string;
  /** 按与指定节点的网络距离排序，`_agent` 表示当前 Agent。 */
  near?: string;
}

export interface ConsulCatalogServicesOptions extends ConsulQueryOptions {
  nodeMeta?: string;
}

export interface ConsulRegisterServiceOptions extends ConsulScope {
  /** 删除本次注册定义中已不存在的旧检查，使重复注册保持幂等。 */
  replaceExistingChecks?: boolean;
  token?: string;
  signal?: AbortSignal;
}

/**
 * 面向 NestJS 的 Consul HTTP API 封装。
 *
 * 服务注册使用本地 Agent API，由 Agent 通过反熵机制同步 Catalog；服务发现读取 Health API；
 * KV 写入支持 CAS 和 Session 锁。底层 request 方法保留给未封装的 `/v1` endpoint 使用。
 */
@Injectable()
export class ConsulService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(ConsulService.name);
  private readonly baseUrl: URL;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly retryBaseDelayMs: number;
  private readonly logging: boolean;
  private autoRegisteredServiceId?: string;

  constructor(@Inject(CONSUL_MODULE_OPTIONS) readonly options: Readonly<ConsulModuleOptions>) {
    this.baseUrl = this.validateBaseUrl(options.baseUrl);
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.retryBaseDelayMs = options.retryBaseDelayMs ?? DEFAULT_RETRY_BASE_DELAY_MS;
    this.logging = options.logging ?? false;

    this.assertPositiveInteger(this.timeoutMs, 'timeoutMs');
    this.assertNonNegativeInteger(this.maxRetries, 'maxRetries');
    this.assertPositiveInteger(this.retryBaseDelayMs, 'retryBaseDelayMs');
    if (options.token !== undefined) this.assertNonEmptyString(options.token, 'token');
    if (options.datacenter !== undefined) this.assertNonEmptyString(options.datacenter, 'datacenter');
    if (options.namespace !== undefined) this.assertNonEmptyString(options.namespace, 'namespace');
    if (options.partition !== undefined) this.assertNonEmptyString(options.partition, 'partition');
    if (options.service) this.validateService(options.service);
  }

  /** 配置 service 后默认在应用启动时注册；failFast=false 时仅记录错误并继续启动。 */
  async onApplicationBootstrap(): Promise<void> {
    const service = this.options.service;
    if (!service || this.options.registerOnBootstrap === false) return;

    try {
      await this.registerService(service, { replaceExistingChecks: this.options.replaceExistingChecks ?? true });
      this.autoRegisteredServiceId = service.ID ?? service.Name;
    } catch (error) {
      this.error(`Consul 服务自动注册失败：service=${service.Name}`, error);
      if (this.options.failFast !== false) throw error;
    }
  }

  /** 仅注销由当前模块自动注册成功的服务；失败不会阻塞 NestJS 关闭流程。 */
  async onApplicationShutdown(): Promise<void> {
    if (!this.autoRegisteredServiceId || this.options.deregisterOnShutdown === false) return;

    try {
      await this.deregisterService(this.autoRegisteredServiceId);
    } catch (error) {
      this.error(`Consul 服务自动注销失败：serviceId=${this.autoRegisteredServiceId}`, error);
    }
  }

  /** 查询本地 Agent 的稳定配置信息；DebugConfig 不应作为稳定契约使用。 */
  async getAgentSelf(): Promise<Record<string, unknown>> {
    return (await this.request<Record<string, unknown>>('/v1/agent/self')).data;
  }

  /** 查询 Consul Agent 版本。 */
  async getAgentVersion(): Promise<Record<string, unknown>> {
    return (await this.request<Record<string, unknown>>('/v1/agent/version')).data;
  }

  /** 获取当前 Raft leader 地址；空字符串表示暂时没有 leader。 */
  async getLeader(): Promise<string> {
    return (await this.request<string>('/v1/status/leader')).data;
  }

  /** 健康探测不写入任何 Consul 状态，适合 readiness 检查。 */
  async isHealthy(): Promise<boolean> {
    try {
      return (await this.getLeader()).length > 0;
    } catch (error) {
      this.error('Consul 健康检查失败', error);
      return false;
    }
  }

  /** 列出当前 Agent 管理的本地服务，与全局 Catalog 视图可能短暂不一致。 */
  async listAgentServices(options: ConsulAgentServicesOptions = {}): Promise<ConsulResponse<Record<string, ConsulAgentService>>> {
    return this.request<Record<string, ConsulAgentService>>('/v1/agent/services', {
      ...options,
      query: { filter: options.filter },
    });
  }

  /**
   * 向本地 Agent 注册或更新服务。默认替换已移除的检查，便于部署时幂等更新定义。
   */
  async registerService(service: ConsulServiceRegistration, options: ConsulRegisterServiceOptions = {}): Promise<void> {
    this.validateService(service);
    await this.request('/v1/agent/service/register', {
      method: 'PUT',
      body: service,
      ...options,
      query: { 'replace-existing-checks': options.replaceExistingChecks ?? true },
      responseType: 'text',
    });
    this.log(`Consul 服务注册成功：service=${service.Name}, serviceId=${service.ID ?? service.Name}`);
  }

  /** 从当前 Agent 注销服务及其关联检查。 */
  async deregisterService(serviceId: string, options: ConsulQueryOptions = {}): Promise<void> {
    this.assertResourceName(serviceId, 'serviceId');
    await this.request(`/v1/agent/service/deregister/${encodeURIComponent(serviceId)}`, { ...options, method: 'PUT', responseType: 'text' });
    this.log(`Consul 服务注销成功：serviceId=${serviceId}`);
  }

  /** 开启或关闭单个服务的维护模式；开启后服务不会出现在 passing 查询中。 */
  async setServiceMaintenance(serviceId: string, enabled: boolean, reason?: string, options: ConsulQueryOptions = {}): Promise<void> {
    this.assertResourceName(serviceId, 'serviceId');
    await this.request(`/v1/agent/service/maintenance/${encodeURIComponent(serviceId)}`, {
      ...options,
      method: 'PUT',
      query: { enable: enabled, reason },
      responseType: 'text',
    });
  }

  /** 更新 TTL 检查状态；output 仅用于诊断，不应包含凭据或敏感业务数据。 */
  async updateTtlCheck(checkId: string, status: 'pass' | 'warn' | 'fail', output?: string, options: ConsulQueryOptions = {}): Promise<void> {
    this.assertResourceName(checkId, 'checkId');
    await this.request(`/v1/agent/check/${status}/${encodeURIComponent(checkId)}`, {
      ...options,
      method: 'PUT',
      query: { note: output },
      responseType: 'text',
    });
  }

  /** 通过 Health API 查询服务实例；默认仅返回健康实例。 */
  async discoverService(serviceName: string, options: ConsulServiceDiscoveryOptions = {}): Promise<ConsulResponse<ConsulHealthServiceEntry[]>> {
    this.assertResourceName(serviceName, 'serviceName');
    return this.request<ConsulHealthServiceEntry[]>(`/v1/health/service/${encodeURIComponent(serviceName)}`, {
      ...options,
      query: {
        passing: options.passing ?? true,
        tag: options.tag,
        near: options.near,
      },
    });
  }

  /** 获取 Catalog 中的服务及标签映射。 */
  async listCatalogServices(options: ConsulCatalogServicesOptions = {}): Promise<ConsulResponse<Record<string, string[]>>> {
    return this.request<Record<string, string[]>>('/v1/catalog/services', {
      ...options,
      query: { 'node-meta': options.nodeMeta, filter: options.filter },
    });
  }

  /** 获取单个 KV 条目；不存在时返回 null。Value 保持 Consul 原始 Base64 形式。 */
  async getKv(key: string, options: ConsulKvReadOptions = {}): Promise<ConsulResponse<ConsulKvEntry | null>> {
    const response = await this.request<ConsulKvEntry[]>(this.kvPath(key), {
      ...options,
      acceptedStatuses: [200, 404],
    });
    if (response.status === 404) return { ...response, data: null };
    return { ...response, data: response.data[0] ?? null };
  }

  /** 获取并以 UTF-8 解码 KV 值；键不存在或值为空时返回 null。 */
  async getKvText(key: string, options: ConsulKvReadOptions = {}): Promise<string | null> {
    const entry = (await this.getKv(key, options)).data;
    return entry?.Value == null ? null : Buffer.from(entry.Value, 'base64').toString('utf8');
  }

  /** 递归读取某个前缀下的 KV 条目。 */
  async listKv(prefix: string, options: ConsulKvReadOptions = {}): Promise<ConsulResponse<ConsulKvEntry[]>> {
    const response = await this.request<ConsulKvEntry[]>(this.kvPath(prefix), {
      ...options,
      query: { recurse: true, separator: options.separator },
      acceptedStatuses: [200, 404],
    });
    return response.status === 404 ? { ...response, data: [] } : response;
  }

  /** 仅列出前缀下的键名，不读取 Value，适合大目录扫描。 */
  async listKvKeys(prefix: string, options: ConsulKvReadOptions = {}): Promise<ConsulResponse<string[]>> {
    const response = await this.request<string[]>(this.kvPath(prefix), {
      ...options,
      query: { keys: true, separator: options.separator },
      acceptedStatuses: [200, 404],
    });
    return response.status === 404 ? { ...response, data: [] } : response;
  }

  /**
   * 写入 KV；返回 false 表示 CAS 条件失败，或 acquire/release 锁操作未成功。
   * 写操作默认不自动重试，避免网络结果不明确时重复改变状态。
   */
  async putKv(key: string, value: string | Uint8Array, options: ConsulKvWriteOptions = {}): Promise<boolean> {
    const response = await this.request<boolean>(this.kvPath(key), {
      ...options,
      method: 'PUT',
      body: value,
      query: { flags: options.flags, cas: options.cas, acquire: options.acquire, release: options.release },
    });
    return response.data;
  }

  /** 删除单个 KV 键；recurse=true 时删除整个前缀，调用方应谨慎使用。 */
  async deleteKv(key: string, options: ConsulScope & { recurse?: boolean; cas?: number; token?: string; signal?: AbortSignal } = {}): Promise<boolean> {
    const response = await this.request<boolean>(this.kvPath(key), {
      ...options,
      method: 'DELETE',
      query: { recurse: options.recurse, cas: options.cas },
    });
    return response.data;
  }

  /** 创建 Session，可与 KV acquire/release 组合实现分布式锁。 */
  async createSession(definition: ConsulSessionDefinition = {}, options: ConsulQueryOptions = {}): Promise<string> {
    const response = await this.request<{ ID?: unknown }>('/v1/session/create', { ...options, method: 'PUT', body: definition });
    if (typeof response.data.ID !== 'string' || !response.data.ID) {
      throw new ConsulResponseError('/v1/session/create', 'Consul 创建 Session 的响应缺少 ID');
    }
    return response.data.ID;
  }

  /** 续约 Session；TTL Session 必须在 TTL 到期前定期续约。 */
  async renewSession(sessionId: string, options: ConsulQueryOptions = {}): Promise<ConsulSession> {
    this.assertResourceName(sessionId, 'sessionId');
    const response = await this.request<ConsulSession[]>(`/v1/session/renew/${encodeURIComponent(sessionId)}`, { ...options, method: 'PUT' });
    const session = response.data[0];
    if (!session) throw new ConsulResponseError('/v1/session/renew/:id', 'Consul 续约 Session 的响应为空');
    return session;
  }

  /** 销毁 Session，并依据 Behavior 释放或删除其持有的锁。 */
  async destroySession(sessionId: string, options: ConsulQueryOptions = {}): Promise<void> {
    this.assertResourceName(sessionId, 'sessionId');
    await this.request(`/v1/session/destroy/${encodeURIComponent(sessionId)}`, { ...options, method: 'PUT', responseType: 'text' });
  }

  /** 使用 Session 尝试获取 KV 锁。 */
  acquireLock(key: string, sessionId: string, value = ''): Promise<boolean> {
    return this.putKv(key, value, { acquire: sessionId });
  }

  /** 使用持有锁的 Session 释放 KV 锁。 */
  releaseLock(key: string, sessionId: string, value = ''): Promise<boolean> {
    return this.putKv(key, value, { release: sessionId });
  }

  /**
   * 调用任意 Consul v1 endpoint，并返回数据、HTTP 状态和查询元数据。
   * path 必须以 `/v1/` 开头，防止无意访问配置地址之外的资源。
   */
  async request<T = unknown>(path: string, options: ConsulRequestOptions = {}): Promise<ConsulResponse<T>> {
    if (!path.startsWith('/v1/')) throw new TypeError('Consul API path 必须以 /v1/ 开头');

    const method = options.method ?? 'GET';
    const retry = options.retry ?? method === 'GET';
    const url = this.createRequestUrl(path, options);
    let lastError: unknown;

    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      try {
        const response = await fetch(url, {
          method,
          headers: this.createHeaders(options),
          signal: this.createSignal(options.signal, options.timeoutMs ?? this.timeoutMs),
          body: this.createRequestBody(options.body),
        });

        const accepted = response.ok || options.acceptedStatuses?.includes(response.status);
        if (accepted) {
          const data = await this.parseResponse<T>(response, path, options.responseType ?? 'json');
          this.debug(`Consul API 请求完成：method=${method}, path=${path}, status=${response.status}`);
          return { data, status: response.status, headers: response.headers, meta: this.readQueryMeta(response.headers) };
        }

        const retryable = RETRYABLE_STATUSES.has(response.status);
        if (retry && retryable && attempt < this.maxRetries) {
          await response.body?.cancel();
          await this.waitBeforeRetry(attempt, response.headers.get('retry-after'));
          continue;
        }

        const responseBody = (await response.text()).slice(0, 65_536);
        throw new ConsulApiError(method, path, response.status, responseBody, retryable);
      } catch (error) {
        if (error instanceof ConsulApiError || error instanceof ConsulResponseError) throw error;
        lastError = error;
        if (!retry || options.signal?.aborted || attempt >= this.maxRetries) break;
        await this.waitBeforeRetry(attempt);
      }
    }

    const apiError = new ConsulApiError(method, path, 0, '', true, { cause: lastError });
    this.error(apiError.message, lastError);
    throw apiError;
  }

  private createRequestUrl(path: string, options: ConsulRequestOptions): URL {
    const url = new URL(path.slice(1), this.baseUrl);
    const scope: ConsulScope = {
      datacenter: options.datacenter ?? this.options.datacenter,
      namespace: options.namespace ?? this.options.namespace,
      partition: options.partition ?? this.options.partition,
    };
    if (scope.datacenter) url.searchParams.set('dc', scope.datacenter);
    if (scope.namespace) url.searchParams.set('ns', scope.namespace);
    if (scope.partition) url.searchParams.set('partition', scope.partition);
    if (options.index !== undefined) url.searchParams.set('index', String(options.index));
    if (options.wait) url.searchParams.set('wait', options.wait);
    if (options.cached) url.searchParams.set('cached', 'true');
    if (options.filter) url.searchParams.set('filter', options.filter);
    if (options.consistency && options.consistency !== 'default') url.searchParams.set(options.consistency, 'true');
    for (const [key, value] of Object.entries(options.query ?? {})) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
    return url;
  }

  private createHeaders(options: ConsulRequestOptions): Headers {
    const headers = new Headers({ Accept: options.responseType === 'bytes' ? 'application/octet-stream' : 'application/json', ...options.headers });
    const token = options.token ?? this.options.token;
    if (token) headers.set('X-Consul-Token', token);
    if (options.body !== undefined && !(options.body instanceof Uint8Array) && typeof options.body !== 'string') {
      headers.set('Content-Type', 'application/json');
    }
    return headers;
  }

  private createRequestBody(body: unknown): BodyInit | undefined {
    if (body === undefined) return undefined;
    if (typeof body === 'string') return body;
    // 复制到普通 ArrayBuffer，避免 SharedArrayBuffer 不属于 fetch BlobPart 的类型范围。
    if (body instanceof Uint8Array) return new Blob([new Uint8Array(body)]);
    return JSON.stringify(body);
  }

  private createSignal(signal: AbortSignal | undefined, timeoutMs: number): AbortSignal {
    this.assertPositiveInteger(timeoutMs, 'timeoutMs');
    const timeoutSignal = AbortSignal.timeout(timeoutMs);
    return signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;
  }

  private async parseResponse<T>(response: Response, path: string, responseType: 'json' | 'text' | 'bytes'): Promise<T> {
    if (responseType === 'bytes') return new Uint8Array(await response.arrayBuffer()) as T;
    const text = await response.text();
    if (responseType === 'text') return text as T;
    if (!text) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch (error) {
      throw new ConsulResponseError(path, `Consul API 响应不是有效 JSON：status=${response.status}`, { cause: error });
    }
  }

  private readQueryMeta(headers: Headers): ConsulQueryMeta {
    return {
      index: this.readNumberHeader(headers, 'x-consul-index'),
      knownLeader: this.readBooleanHeader(headers, 'x-consul-knownleader'),
      lastContactMs: this.readNumberHeader(headers, 'x-consul-lastcontact'),
      contentHash: headers.get('x-consul-contenthash') ?? undefined,
      effectiveConsistency: headers.get('x-consul-effective-consistency') ?? undefined,
      queryBackend: headers.get('x-consul-query-backend') ?? undefined,
      resultsFilteredByAcls: headers.get('x-consul-results-filtered-by-acls') === 'true',
    };
  }

  private readNumberHeader(headers: Headers, name: string): number | undefined {
    const value = headers.get(name);
    if (value === null) return undefined;
    const number = Number(value);
    return Number.isFinite(number) ? number : undefined;
  }

  private readBooleanHeader(headers: Headers, name: string): boolean | undefined {
    const value = headers.get(name);
    return value === null ? undefined : value === 'true';
  }

  private async waitBeforeRetry(attempt: number, retryAfter?: string | null): Promise<void> {
    const serverDelay = retryAfter ? this.parseRetryAfter(retryAfter) : undefined;
    const exponentialDelay = this.retryBaseDelayMs * 2 ** attempt;
    const jitter = Math.floor(Math.random() * this.retryBaseDelayMs);
    await new Promise((resolve) => setTimeout(resolve, serverDelay ?? exponentialDelay + jitter));
  }

  private parseRetryAfter(value: string): number | undefined {
    const seconds = Number(value);
    if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1_000;
    const timestamp = Date.parse(value);
    return Number.isNaN(timestamp) ? undefined : Math.max(0, timestamp - Date.now());
  }

  private kvPath(key: string): string {
    this.assertResourceName(key, 'key');
    return `/v1/kv/${key.split('/').map(encodeURIComponent).join('/')}`;
  }

  private validateBaseUrl(value: string): URL {
    this.assertNonEmptyString(value, 'baseUrl');
    const url = new URL(value.endsWith('/') ? value : `${value}/`);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new TypeError('Consul baseUrl 仅支持 http 或 https 协议');
    if (url.username || url.password) throw new TypeError('Consul baseUrl 不允许包含凭据，请使用 token 配置');
    if (url.search || url.hash) throw new TypeError('Consul baseUrl 不允许包含 query 或 hash');
    return url;
  }

  private validateService(service: ConsulServiceRegistration): void {
    this.assertResourceName(service.Name, 'service.Name');
    if (service.ID !== undefined) this.assertResourceName(service.ID, 'service.ID');
    if (service.Port !== undefined && (!Number.isInteger(service.Port) || service.Port < 0 || service.Port > 65_535)) {
      throw new TypeError('Consul service.Port 必须是 0 到 65535 的整数');
    }
    if (service.Port !== undefined && service.Ports !== undefined) throw new TypeError('Consul service.Port 与 service.Ports 不能同时配置');
    if (service.Check && service.Checks) throw new TypeError('Consul service.Check 与 service.Checks 不能同时配置');
  }

  private assertResourceName(value: string, name: string): void {
    this.assertNonEmptyString(value, name);
    if (value.includes('\n') || value.includes('\r')) throw new TypeError(`Consul ${name} 不允许包含换行符`);
  }

  private assertNonEmptyString(value: unknown, name: string): asserts value is string {
    if (typeof value !== 'string' || !value.trim()) throw new TypeError(`Consul ${name} 不能为空`);
  }

  private assertPositiveInteger(value: number, name: string): void {
    if (!Number.isInteger(value) || value <= 0) throw new TypeError(`Consul ${name} 必须是正整数`);
  }

  private assertNonNegativeInteger(value: number, name: string): void {
    if (!Number.isInteger(value) || value < 0) throw new TypeError(`Consul ${name} 必须是非负整数`);
  }

  private log(message: string): void {
    if (this.logging) this.logger.log(message);
  }

  private debug(message: string): void {
    if (this.logging) this.logger.debug(message);
  }

  private error(message: string, error: unknown): void {
    if (!this.logging) return;
    this.logger.error(message, error instanceof Error ? error.stack : String(error));
  }
}
