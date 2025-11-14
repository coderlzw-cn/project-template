/**
 * Consul 服务注册配置
 */
export interface ConsulServiceRegistration {
  /** 服务唯一标识 */
  ID: string;
  /** 服务名称 */
  Name: string;
  /** 服务地址 */
  Address: string;
  /** 服务端口 */
  Port: number;
  /** 服务标签 */
  Tags?: string[];
  /** 服务元数据 */
  Meta?: Record<string, string>;
  /** 健康检查配置 */
  Check?: ConsulHealthCheck;
  /** 多个健康检查配置 */
  Checks?: ConsulHealthCheck[];
}

/**
 * Consul 健康检查配置
 */
export interface ConsulHealthCheck {
  /** 健康检查 ID */
  CheckID?: string;
  /** 健康检查名称 */
  Name?: string;
  /** 健康检查类型: http, tcp, script, ttl, grpc */
  Type?: 'http' | 'tcp' | 'script' | 'ttl' | 'grpc';
  /** HTTP 健康检查地址 */
  HTTP?: string;
  /** TCP 健康检查地址 */
  TCP?: string;
  /** 脚本健康检查命令 */
  Script?: string;
  /** 健康检查间隔时间 */
  Interval?: string;
  /** 健康检查超时时间 */
  Timeout?: string;
  /** TTL 健康检查的 TTL 时间 */
  TTL?: string;
  /** 健康检查状态 */
  Status?: 'passing' | 'warning' | 'critical';
  /** 健康检查失败次数阈值 */
  DeregisterCriticalServiceAfter?: string;
  /** HTTP 健康检查的请求头 */
  Header?: Record<string, string[]>;
}

/**
 * Consul 服务信息
 */
export interface ConsulServiceInfo {
  /** 服务 ID */
  ID: string;
  /** 服务名称 */
  Service: string;
  /** 服务地址 */
  Address: string;
  /** 服务端口 */
  Port: number;
  /** 服务标签 */
  Tags?: string[];
  /** 服务元数据 */
  Meta?: Record<string, string>;
  /** 健康检查状态 */
  Health?: 'passing' | 'warning' | 'critical';
}

/**
 * Consul Catalog 服务响应
 */
export interface ConsulCatalogService {
  ServiceID: string;
  ServiceName: string;
  ServiceAddress?: string;
  Address: string;
  ServicePort: number;
  ServiceTags?: string[];
  ServiceMeta?: Record<string, string>;
}

/**
 * Consul Health Check 响应
 */
export interface ConsulHealthCheckResponse {
  Node: {
    Address: string;
  };
  Service: {
    ID: string;
    Service: string;
    Address?: string;
    Port: number;
    Tags?: string[];
    Meta?: Record<string, string>;
  };
  Checks: Array<{
    Status: 'passing' | 'warning' | 'critical';
  }>;
}

/**
 * Consul 集群成员信息
 */
export interface ConsulMember {
  Name: string;
  Addr: string;
  Port: number;
  Tags: Record<string, string>;
  Status: number;
  ProtocolMin: number;
  ProtocolMax: number;
  ProtocolCur: number;
  DelegateMin: number;
  DelegateMax: number;
  DelegateCur: number;
}

/**
 * Consul 配置选项
 */
export interface ConsulModuleOptions {
  /** Consul 服务器地址 */
  host?: string;
  /** Consul 服务器端口 */
  port?: number;
  /** Consul 服务器协议 */
  protocol?: 'http' | 'https';
  /** 是否启用服务注册 */
  register?: boolean;
  /** 服务注册配置 */
  service?: ConsulServiceRegistration;
  /** 是否启用服务发现 */
  discover?: boolean;
  /** 请求超时时间（毫秒） */
  timeout?: number;
  /** 默认数据中心 */
  datacenter?: string;
  /** ACL token */
  token?: string;
  /** 服务注册重试配置 */
  retry?: {
    /** 最大重试次数，-1 或 0 表示无限重试 */
    maxRetries?: number;
    /** 重试间隔时间（毫秒） */
    retryInterval?: number;
    /** 是否启用指数退避（每次重试间隔时间翻倍） */
    exponentialBackoff?: boolean;
    /** 最大重试间隔时间（毫秒），用于指数退避 */
    maxRetryInterval?: number;
  };
}
