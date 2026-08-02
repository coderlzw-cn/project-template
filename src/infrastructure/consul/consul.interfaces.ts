/** Consul HTTP API 的读取一致性模式。 */
export type ConsulConsistency = 'default' | 'consistent' | 'stale';

/** Consul 健康检查状态。 */
export type ConsulHealthStatus = 'passing' | 'warning' | 'critical' | 'maintenance';

/** 企业版作用域；社区版会忽略未配置的 namespace 和 partition。 */
export interface ConsulScope {
  /** Consul 数据中心，例如 dc1。 */
  datacenter?: string;
  /** Consul Enterprise 命名空间。 */
  namespace?: string;
  /** Consul Enterprise 管理分区。 */
  partition?: string;
}

/** 阻塞查询及一致性参数。 */
export interface ConsulQueryOptions extends ConsulScope {
  /** 读取一致性，默认使用 Consul endpoint 自身的默认值。 */
  consistency?: ConsulConsistency;
  /** 上一次响应的 X-Consul-Index，用于阻塞查询。 */
  index?: string | number;
  /** 阻塞查询最长等待时间，例如 30s、5m。 */
  wait?: string;
  /** 启用支持该参数的 Agent 缓存。 */
  cached?: boolean;
  /** Consul filter 表达式。 */
  filter?: string;
  /** 覆盖模块级 ACL Token。 */
  token?: string;
  /** 调用方取消信号。 */
  signal?: AbortSignal;
}

/** Consul 查询响应头中携带的索引和一致性信息。 */
export interface ConsulQueryMeta {
  index?: number;
  knownLeader?: boolean;
  lastContactMs?: number;
  contentHash?: string;
  effectiveConsistency?: string;
  queryBackend?: string;
  resultsFilteredByAcls: boolean;
}

/** 保留响应数据及查询元数据，便于实现阻塞查询和缓存。 */
export interface ConsulResponse<T> {
  data: T;
  status: number;
  headers: Headers;
  meta: ConsulQueryMeta;
}

/** 底层 HTTP 调用配置；用于访问尚未提供便捷方法的 Consul v1 endpoint。 */
export interface ConsulRequestOptions extends ConsulQueryOptions {
  method?: 'GET' | 'PUT' | 'POST' | 'DELETE';
  query?: Readonly<Record<string, string | number | boolean | undefined>>;
  headers?: Readonly<Record<string, string>>;
  body?: unknown;
  /** 单次请求超时，单位毫秒；阻塞查询应设置为大于 wait 的值。 */
  timeoutMs?: number;
  /** 是否重试。默认仅重试 GET 请求的网络错误、429 和部分 5xx。 */
  retry?: boolean;
  /** 允许调用方处理 404 等非 2xx 响应。 */
  acceptedStatuses?: readonly number[];
  responseType?: 'json' | 'text' | 'bytes';
}

/** Consul Agent HTTP/TCP/gRPC/TTL 健康检查定义。 */
export interface ConsulServiceCheck {
  CheckID?: string;
  Name?: string;
  Notes?: string;
  HTTP?: string;
  Method?: string;
  Header?: Record<string, string[]>;
  Body?: string;
  TCP?: string;
  UDP?: string;
  GRPC?: string;
  GRPCUseTLS?: boolean;
  TTL?: string;
  Interval?: string;
  Timeout?: string;
  TLSServerName?: string;
  TLSSkipVerify?: boolean;
  DeregisterCriticalServiceAfter?: string;
  SuccessBeforePassing?: number;
  FailuresBeforeWarning?: number;
  FailuresBeforeCritical?: number;
}

export interface ConsulServicePort {
  name: string;
  port: number;
  default?: boolean;
}

/** 注册到本地 Consul Agent 的服务定义。 */
export interface ConsulServiceRegistration {
  Name: string;
  ID?: string;
  Tags?: string[];
  Address?: string;
  Port?: number;
  Ports?: ConsulServicePort[];
  Meta?: Record<string, string>;
  Namespace?: string;
  Partition?: string;
  EnableTagOverride?: boolean;
  Weights?: { Passing: number; Warning: number };
  Check?: ConsulServiceCheck;
  Checks?: ConsulServiceCheck[];
}

/** Agent 返回的已注册服务实例。 */
export interface ConsulAgentService {
  ID: string;
  Service: string;
  Tags: string[];
  Meta: Record<string, string>;
  Port: number;
  Address: string;
  Namespace?: string;
  Datacenter?: string;
  EnableTagOverride?: boolean;
}

/** Consul 健康检查结果。 */
export interface ConsulHealthCheck {
  Node: string;
  CheckID: string;
  Name: string;
  Status: ConsulHealthStatus;
  Notes: string;
  Output: string;
  ServiceID: string;
  ServiceName: string;
  ServiceTags: string[];
  CreateIndex: number;
  ModifyIndex: number;
}

/** `/health/service/:service` 返回的健康服务实例。 */
export interface ConsulHealthServiceEntry {
  Node: {
    ID: string;
    Node: string;
    Address: string;
    Datacenter: string;
    Meta: Record<string, string>;
    CreateIndex: number;
    ModifyIndex: number;
  };
  Service: ConsulAgentService;
  Checks: ConsulHealthCheck[];
}

/** Consul KV API 的原始条目；Value 为 Base64 字符串。 */
export interface ConsulKvEntry {
  LockIndex: number;
  Key: string;
  Flags: number;
  Value: string | null;
  CreateIndex: number;
  ModifyIndex: number;
  Session: string;
}

export interface ConsulKvReadOptions extends ConsulQueryOptions {
  recurse?: boolean;
  keys?: boolean;
  separator?: string;
}

export interface ConsulKvWriteOptions extends ConsulScope {
  flags?: number;
  cas?: number;
  acquire?: string;
  release?: string;
  token?: string;
  signal?: AbortSignal;
}

export interface ConsulSessionDefinition {
  Name?: string;
  Node?: string;
  Checks?: string[];
  LockDelay?: string;
  Behavior?: 'release' | 'delete';
  TTL?: string;
}

export interface ConsulSession {
  ID: string;
  Name: string;
  Node: string;
  Checks: string[];
  LockDelay: number;
  Behavior: 'release' | 'delete';
  TTL: string;
  CreateIndex: number;
}

/** NestJS Consul 模块配置。 */
export interface ConsulModuleOptions extends ConsulScope {
  /** Consul HTTP 地址，例如 http://127.0.0.1:8500。 */
  baseUrl: string;
  /** ACL Token；仅通过 X-Consul-Token 请求头发送，避免进入 URL 和访问日志。 */
  token?: string;
  /** 普通请求超时，单位毫秒，默认 10000。 */
  timeoutMs?: number;
  /** 安全读取请求失败后的最大重试次数，默认 2。 */
  maxRetries?: number;
  /** 指数退避的基础延迟，单位毫秒，默认 200。 */
  retryBaseDelayMs?: number;
  /** 是否输出封装层日志，默认关闭；日志不会记录 ACL Token 或 KV 内容。 */
  logging?: boolean;
  /** 应用启动时自动注册的服务。 */
  service?: ConsulServiceRegistration;
  /** 是否在应用启动时注册 service，配置 service 后默认开启。 */
  registerOnBootstrap?: boolean;
  /** 自动注册时是否替换已移除的检查，保证注册幂等，默认 true。 */
  replaceExistingChecks?: boolean;
  /** 注册失败是否阻止应用启动，默认 true。 */
  failFast?: boolean;
  /** 应用正常退出时是否注销自动注册的服务，默认 true。 */
  deregisterOnShutdown?: boolean;
}
