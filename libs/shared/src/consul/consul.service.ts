import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Inject, Optional } from '@nestjs/common';
import { defer, retry, timer, Observable } from 'rxjs';
import type {
  ConsulModuleOptions,
  ConsulServiceRegistration,
  ConsulServiceInfo,
  ConsulCatalogService,
  ConsulHealthCheckResponse,
  ConsulMember,
} from './consul.interface';
import { MODULE_OPTIONS_TOKEN } from './consul.module-definition';

@Injectable()
export class ConsulService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ConsulService.name);
  private readonly baseUrl: string;
  private readonly options: ConsulModuleOptions;
  private registeredServiceId: string | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor(@Inject(MODULE_OPTIONS_TOKEN) @Optional() options?: ConsulModuleOptions) {
    this.options = {
      host: '127.0.0.1',
      port: 8500,
      protocol: 'http',
      register: false,
      discover: false,
      timeout: 5000,
      ...(options ?? {}),
    };

    this.baseUrl = `${this.options.protocol}://${this.options.host}:${this.options.port}`;
  }

  onModuleInit() {
    if (this.options.register && this.options.service) {
      this.registerServiceWithRetry(this.options.service).subscribe({
        next: () => {
          this.logger.log(`ID: ${this.options.service?.ID} Name: ${this.options.service?.Name} Service registration completed`);
        },
        error: (error: Error) => {
          this.logger.error(`ID: ${this.options.service?.ID} Name: ${this.options.service?.Name} Service registration failed: ${error.message}`);
        },
      });
    }
  }

  async onModuleDestroy() {
    this.logger.log('Starting service deregistration...');
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    if (this.registeredServiceId) {
      try {
        await this.deregisterService(this.registeredServiceId);
      } catch (error) {
        this.logger.error(`Failed to deregister service during shutdown: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    this.logger.log('Service deregistration completed');
  }

  /**
   * 带重试机制的服务注册（使用 RxJS）
   * @param service 服务注册配置
   * @returns Observable<void> 注册过程的 Observable
   */
  registerServiceWithRetry(service: ConsulServiceRegistration): Observable<void> {
    const retryOptions = this.options.retry;
    const maxRetries: number = retryOptions?.maxRetries ?? 3;
    const retryInterval: number = retryOptions?.retryInterval ?? 1000;
    const exponentialBackoff: boolean = retryOptions?.exponentialBackoff ?? false;
    const maxRetryInterval: number = retryOptions?.maxRetryInterval ?? 30000;
    const isInfiniteRetry = maxRetries === -1 || maxRetries === 0;

    // 使用 defer 延迟执行，确保每次重试都重新执行注册
    const registerObservable = defer(() => {
      return new Observable<void>((subscriber) => {
        this.registerService(service)
          .then(() => {
            subscriber.next();
            subscriber.complete();
          })
          .catch((error) => {
            subscriber.error(error);
          });
      });
    });

    // 计算重试延迟时间的辅助函数
    const calculateDelay = (attempt: number): number => {
      if (exponentialBackoff) {
        return Math.min(retryInterval * Math.pow(2, attempt - 1), maxRetryInterval);
      }
      return retryInterval;
    };

    // 使用新的 retry API（RxJS 7+）
    const retryConfig = isInfiniteRetry
      ? {
          delay: (error: Error, retryCount: number) => {
            const delayTime = calculateDelay(retryCount);
            const errorMessage = error.message;
            this.logger.warn(`Service registration failed (attempt ${retryCount}, infinite retry): ${errorMessage}. Retrying in ${delayTime}ms...`);
            return timer(delayTime);
          },
        }
      : {
          count: maxRetries,
          delay: (error: Error, retryCount: number) => {
            const delayTime = calculateDelay(retryCount);
            const errorMessage = error.message;
            if (retryCount <= maxRetries) {
              this.logger.warn(`Service registration failed (attempt ${retryCount}/${maxRetries}): ${errorMessage}. Retrying in ${delayTime}ms...`);
            } else {
              this.logger.error(`Service registration failed after ${maxRetries} attempts: ${errorMessage}`);
            }
            return timer(delayTime);
          },
        };

    // 返回应用重试策略的 Observable
    return registerObservable.pipe(retry(retryConfig));
  }

  /**
   * 注册服务到 Consul（单次尝试）
   * @param service 服务注册配置
   */
  async registerService(service: ConsulServiceRegistration): Promise<void> {
    try {
      const url = `${this.baseUrl}/v1/agent/service/register`;
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(this.options.token && { 'X-Consul-Token': this.options.token }),
        },
        body: JSON.stringify(service),
        signal: AbortSignal.timeout(this.options.timeout!),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to register service: ${response.status} ${errorText}`);
      }

      this.registeredServiceId = service.ID;
      this.logger.log(`Service registered successfully: ${service.Name} (${service.ID})`);

      // 如果使用 TTL 健康检查，启动定期更新
      if (service.Check?.Type === 'ttl' && service.Check?.TTL) {
        this.startTTLHealthCheck(service.ID, service.Check.TTL);
      }
    } catch (error) {
      this.logger.error(`Failed to register service: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * 注销服务
   * @param serviceId 服务 ID
   */
  async deregisterService(serviceId: string): Promise<void> {
    try {
      const url = `${this.baseUrl}/v1/agent/service/deregister/${serviceId}`;
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          ...(this.options.token && { 'X-Consul-Token': this.options.token }),
        },
        signal: AbortSignal.timeout(this.options.timeout!),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to deregister service: ${response.status} ${errorText}`);
      }

      this.logger.log(`Service deregistered successfully: ${serviceId}`);
      this.registeredServiceId = null;
    } catch (error) {
      this.logger.error(`Failed to deregister service: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * 发现服务（从 catalog 获取服务列表）
   * @param serviceName 服务名称
   * @param passing 是否只返回健康状态为 passing 的服务
   */
  async discoverService(serviceName: string, passing: boolean = true): Promise<ConsulServiceInfo[]> {
    try {
      const url = `${this.baseUrl}/v1/catalog/service/${serviceName}${passing ? '?passing=true' : ''}`;
      const response = await fetch(url, {
        headers: {
          ...(this.options.token && { 'X-Consul-Token': this.options.token }),
        },
        signal: AbortSignal.timeout(this.options.timeout!),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to discover service: ${response.status} ${errorText}`);
      }

      const services = (await response.json()) as ConsulCatalogService[];
      return services.map((service) => ({
        ID: service.ServiceID,
        Service: service.ServiceName,
        Address: service.ServiceAddress || service.Address,
        Port: service.ServicePort,
        Tags: service.ServiceTags,
        Meta: service.ServiceMeta,
      }));
    } catch (error) {
      this.logger.error(`Failed to discover service: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * 获取健康的服务实例（从 health 端点获取）
   * @param serviceName 服务名称
   * @param passing 是否只返回健康状态为 passing 的服务
   */
  async getHealthyService(serviceName: string, passing: boolean = true): Promise<ConsulServiceInfo[]> {
    try {
      const url = `${this.baseUrl}/v1/health/service/${serviceName}${passing ? '?passing=true' : ''}`;
      const response = await fetch(url, {
        headers: {
          ...(this.options.token && { 'X-Consul-Token': this.options.token }),
        },
        signal: AbortSignal.timeout(this.options.timeout!),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get healthy service: ${response.status} ${errorText}`);
      }

      const healthChecks = (await response.json()) as ConsulHealthCheckResponse[];
      return healthChecks.map((check) => ({
        ID: check.Service.ID,
        Service: check.Service.Service,
        Address: check.Service.Address || check.Node.Address,
        Port: check.Service.Port,
        Tags: check.Service.Tags,
        Meta: check.Service.Meta,
        Health: this.getHealthStatus(check.Checks),
      }));
    } catch (error) {
      this.logger.error(`Failed to get healthy service: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * 获取所有服务列表
   */
  async getAllServices(): Promise<Record<string, string[]>> {
    try {
      const url = `${this.baseUrl}/v1/catalog/services`;
      const response = await fetch(url, {
        headers: {
          ...(this.options.token && { 'X-Consul-Token': this.options.token }),
        },
        signal: AbortSignal.timeout(this.options.timeout!),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get all services: ${response.status} ${errorText}`);
      }

      return (await response.json()) as Record<string, string[]>;
    } catch (error) {
      this.logger.error(`Failed to get all services: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * 更新 TTL 健康检查状态
   * @param checkId 健康检查 ID
   * @param status 健康状态
   * @param note 备注
   */
  async updateTTLHealthCheck(checkId: string, status: 'pass' | 'warn' | 'fail', note?: string): Promise<void> {
    try {
      const url = `${this.baseUrl}/v1/agent/check/${status}/${checkId}`;
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(this.options.token && { 'X-Consul-Token': this.options.token }),
        },
        body: note ? JSON.stringify({ Note: note }) : undefined,
        signal: AbortSignal.timeout(this.options.timeout!),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update TTL health check: ${response.status} ${errorText}`);
      }
    } catch (error) {
      this.logger.error(`Failed to update TTL health check: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * 获取健康检查状态
   * @param checks 健康检查列表
   */
  private getHealthStatus(checks: Array<{ Status: 'passing' | 'warning' | 'critical' }>): 'passing' | 'warning' | 'critical' {
    if (!checks || checks.length === 0) {
      return 'passing';
    }

    const hasCritical = checks.some((check) => check.Status === 'critical');
    if (hasCritical) {
      return 'critical';
    }

    const hasWarning = checks.some((check) => check.Status === 'warning');
    if (hasWarning) {
      return 'warning';
    }

    return 'passing';
  }

  /**
   * 启动 TTL 健康检查定期更新
   * @param serviceId 服务 ID
   * @param ttl TTL 时间（如 "10s"）
   */
  private startTTLHealthCheck(serviceId: string, ttl: string): void {
    const ttlSeconds = this.parseTTL(ttl);
    if (!ttlSeconds) {
      this.logger.warn(`Invalid TTL format: ${ttl}`);
      return;
    }

    // TTL 检查应该在 TTL 时间的 80% 时更新
    const intervalMs = ttlSeconds * 0.8 * 1000;
    const checkId = `service:${serviceId}`;

    this.healthCheckInterval = setInterval(() => {
      void this.updateTTLHealthCheck(checkId, 'pass').catch((error) => {
        this.logger.error(`Failed to update TTL health check: ${error instanceof Error ? error.message : String(error)}`);
      });
    }, intervalMs);

    this.logger.log(`TTL health check started for service: ${serviceId}, interval: ${intervalMs}ms`);
  }

  /**
   * 解析 TTL 时间字符串
   * @param ttl TTL 时间字符串（如 "10s", "5m"）
   */
  private parseTTL(ttl: string): number | null {
    const match = ttl.match(/^(\d+)([smh])$/);
    if (!match) {
      return null;
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 3600;
      default:
        return null;
    }
  }

  /**
   * 获取 Consul 集群的领导者信息
   */
  async getLeader(): Promise<string> {
    try {
      const url = `${this.baseUrl}/v1/status/leader`;
      const response = await fetch(url, {
        headers: {
          ...(this.options.token && { 'X-Consul-Token': this.options.token }),
        },
        signal: AbortSignal.timeout(this.options.timeout!),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get leader: ${response.status} ${errorText}`);
      }

      const leader = await response.text();
      return leader.replace(/"/g, '');
    } catch (error) {
      this.logger.error(`Failed to get leader: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * 获取 Consul 集群成员信息
   */
  async getMembers(): Promise<ConsulMember[]> {
    try {
      const url = `${this.baseUrl}/v1/agent/members`;
      const response = await fetch(url, {
        headers: {
          ...(this.options.token && { 'X-Consul-Token': this.options.token }),
        },
        signal: AbortSignal.timeout(this.options.timeout!),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get members: ${response.status} ${errorText}`);
      }

      return (await response.json()) as ConsulMember[];
    } catch (error) {
      this.logger.error(`Failed to get members: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
}
