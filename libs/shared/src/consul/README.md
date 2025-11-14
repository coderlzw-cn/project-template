# Consul 模块

基于 Consul HTTP API 实现的服务注册与发现模块。

## 功能特性

- ✅ 服务注册（Service Registration）
- ✅ 服务发现（Service Discovery）
- ✅ 健康检查（Health Check）
  - HTTP 健康检查
  - TTL 健康检查
  - TCP 健康检查
- ✅ 服务注销（Service Deregistration）
- ✅ 集群信息查询

## 使用方法

### 1. 在 AppModule 中导入

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ConsulModule } from '@app/shared/consul';
import { consulConfig } from '../config/app.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [consulConfig],
    }),
    // 方式一：使用 forRoot（同步配置）
    ConsulModule.forRoot({
      host: '127.0.0.1',
      port: 8500,
      protocol: 'http',
      register: true,
      service: {
        ID: 'my-service-1',
        Name: 'my-service',
        Address: '127.0.0.1',
        Port: 3000,
        Tags: ['api', 'v1'],
        Check: {
          HTTP: 'http://127.0.0.1:3000/api/health',
          Interval: '10s',
          Timeout: '3s',
          DeregisterCriticalServiceAfter: '30s',
        },
      },
      // 重试配置（可选）
      retry: {
        maxRetries: -1,              // -1 或 0 表示无限重试，其他数字表示最大重试次数（默认：3）
        retryInterval: 1000,          // 重试间隔时间（毫秒，默认：1000）
        exponentialBackoff: true,     // 是否启用指数退避（默认：false）
        maxRetryInterval: 30000,      // 最大重试间隔时间（毫秒，用于指数退避，默认：30000）
      },
    }),
    // 方式二：使用 forRootAsync（推荐，从配置读取）
    ConsulModule.forRootAsync({
      useFactory: (configService: ConfigService) => {
        const consul = configService.get('consul');
        return {
          host: consul.host,
          port: consul.port,
          protocol: consul.protocol,
          register: consul.register,
          service: consul.service,
          timeout: consul.timeout,
          token: consul.token,
        };
      },
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

> **注意**: 模块使用 `ConfigurableModuleBuilder` 构建，提供了更好的类型安全和更简洁的 API。模块默认是全局的，可以在任何地方注入 `ConsulService` 使用。

### 2. 在服务中使用 ConsulService

```typescript
import { Injectable } from '@nestjs/common';
import { ConsulService } from '@app/shared/consul';

@Injectable()
export class MyService {
  constructor(private readonly consulService: ConsulService) {}

  async discoverOtherService() {
    // 发现服务
    const services = await this.consulService.discoverService('other-service');
    console.log('发现的服务:', services);

    // 获取健康的服务实例
    const healthyServices = await this.consulService.getHealthyService('other-service');
    console.log('健康的服务:', healthyServices);

    // 获取所有服务
    const allServices = await this.consulService.getAllServices();
    console.log('所有服务:', allServices);
  }

  async updateHealthCheck() {
    // 更新 TTL 健康检查状态
    await this.consulService.updateTTLHealthCheck('service:my-service-1', 'pass', 'Service is healthy');
  }

  async getClusterInfo() {
    // 获取集群领导者
    const leader = await this.consulService.getLeader();
    console.log('集群领导者:', leader);

    // 获取集群成员
    const members = await this.consulService.getMembers();
    console.log('集群成员:', members);
  }
}
```

## 环境变量配置

```env
# Consul 服务器配置
CONSUL_HOST=127.0.0.1
CONSUL_PORT=8500
CONSUL_PROTOCOL=http
CONSUL_TIMEOUT=5000
CONSUL_TOKEN=your-token-here
CONSUL_DATACENTER=dc1

# 服务注册配置
CONSUL_REGISTER=true
CONSUL_SERVICE_ID=my-service-1
CONSUL_SERVICE_NAME=my-service
CONSUL_SERVICE_ADDRESS=127.0.0.1
CONSUL_SERVICE_PORT=3000
CONSUL_SERVICE_TAGS=api,v1,production

# 健康检查配置
CONSUL_HEALTH_CHECK_HTTP=http://127.0.0.1:3000/api/health
CONSUL_HEALTH_CHECK_INTERVAL=10s
CONSUL_HEALTH_CHECK_TIMEOUT=3s
CONSUL_DEREGISTER_AFTER=30s

# 重试配置
CONSUL_RETRY_MAX_RETRIES=-1          # -1 或 0 表示无限重试，其他数字表示最大重试次数（默认：3）
CONSUL_RETRY_INTERVAL=1000           # 重试间隔时间（毫秒，默认：1000）
CONSUL_RETRY_EXPONENTIAL_BACKOFF=true # 是否启用指数退避（默认：false）
CONSUL_RETRY_MAX_INTERVAL=30000      # 最大重试间隔时间（毫秒，用于指数退避，默认：30000）
```

## API 说明

### ConsulService 方法

#### registerService(service: ConsulServiceRegistration)
注册服务到 Consul。

#### deregisterService(serviceId: string)
注销服务。

#### discoverService(serviceName: string, passing?: boolean)
从 catalog 获取服务列表。

#### getHealthyService(serviceName: string, passing?: boolean)
从 health 端点获取健康的服务实例。

#### getAllServices()
获取所有服务列表。

#### updateTTLHealthCheck(checkId: string, status: 'pass' | 'warn' | 'fail', note?: string)
更新 TTL 健康检查状态。

#### getLeader()
获取 Consul 集群的领导者信息。

#### getMembers()
获取 Consul 集群成员信息。

## 健康检查类型

### HTTP 健康检查
```typescript
Check: {
  Type: 'http',
  HTTP: 'http://127.0.0.1:3000/api/health',
  Interval: '10s',
  Timeout: '3s',
}
```

### TTL 健康检查
```typescript
Check: {
  Type: 'ttl',
  TTL: '30s',
}
```

### TCP 健康检查
```typescript
Check: {
  Type: 'tcp',
  TCP: '127.0.0.1:3000',
  Interval: '10s',
  Timeout: '3s',
}
```

## 重试机制

服务注册支持配置重试机制，适用于 Consul 服务器暂时不可用的情况：

### 配置选项

- `maxRetries`: 最大重试次数
  - `-1` 或 `0`: 无限重试（直到成功）
  - 其他数字: 最大重试次数（默认：3）
- `retryInterval`: 重试间隔时间（毫秒，默认：1000）
- `exponentialBackoff`: 是否启用指数退避（默认：false）
  - `true`: 每次重试间隔时间翻倍（1s → 2s → 4s → ...）
  - `false`: 固定间隔时间
- `maxRetryInterval`: 最大重试间隔时间（毫秒，用于指数退避，默认：30000）

### 使用示例

```typescript
// 无限重试，固定间隔 1 秒
retry: {
  maxRetries: -1,
  retryInterval: 1000,
}

// 重试 5 次，指数退避（1s → 2s → 4s → 8s → 16s）
retry: {
  maxRetries: 5,
  retryInterval: 1000,
  exponentialBackoff: true,
  maxRetryInterval: 30000,
}
```

## 注意事项

1. 服务注册会在模块初始化时自动执行（如果 `register: true`）
2. 服务注册失败时会根据配置自动重试
3. 服务注销会在模块销毁时自动执行
4. TTL 健康检查会自动在 TTL 时间的 80% 时更新状态
5. 所有 API 调用都支持超时设置
6. 支持 ACL Token 认证
