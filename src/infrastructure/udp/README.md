# UDP 模块使用指南

该目录封装了 Node.js `node:dgram`，提供 UDP 服务端、客户端以及 NestJS 托管服务。所有创建和关闭操作均使用 Promise API。

## 功能概览

| 类型         | 用途                                 | 关闭方式                          |
| ------------ | ------------------------------------ | --------------------------------- |
| `UdpService` | 在 NestJS 中创建并统一管理 UDP 端点  | 应用关闭时自动释放所有托管 Socket |
| `UdpServer`  | 监听端口、接收数据报、回复客户端     | 调用 `close()`                    |
| `UdpClient`  | 向默认远端或单次指定的目标发送数据报 | 调用 `close()`                    |

默认使用 `udp4`，可通过 `type: 'udp6'` 改为 IPv6。

## 在 NestJS 中使用

### 1. 导入模块

`UdpModule` 不是全局模块，需在使用它的模块中显式导入。

```ts
import { Module } from '@nestjs/common';
import { UdpModule } from '@/infrastructure/udp';
import { DeviceGatewayService } from './device-gateway.service';

@Module({
  imports: [UdpModule],
  providers: [DeviceGatewayService],
})
export class DeviceGatewayModule {}
```

### 2. 创建 UDP 服务端

```ts
import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { UdpService, type UdpServer } from '@/infrastructure/udp';

@Injectable()
export class DeviceGatewayService implements OnModuleInit {
  private readonly logger = new Logger(DeviceGatewayService.name);
  private server!: UdpServer;

  constructor(private readonly udpService: UdpService) {}

  async onModuleInit(): Promise<void> {
    this.server = await this.udpService.createServer({
      bind: { port: 9000, address: '0.0.0.0' },
      onMessage: async (message, remote) => {
        const content = message.toString('utf8');
        this.logger.log(`收到 ${remote.address}:${remote.port} 的消息：${content}`);

        // RemoteInfo 包含 address 和 port，可直接用于回复。
        await this.server.send(`ack:${content}`, remote);
      },
      onHandlerError: (error, remote) => {
        this.logger.error(`处理 ${remote.address}:${remote.port} 的消息失败`, error);
      },
    });

    this.logger.log(`UDP 服务端已监听 ${this.server.address().address}:${this.server.address().port}`);
  }
}
```

`UdpService` 会跟踪它创建的服务端和客户端。项目已在 `main.ts` 启用 `app.enableShutdownHooks()`，所以应用关闭时会自动关闭尚未释放的 Socket。

## 客户端用法

### 已连接客户端

配置 `remote` 后，客户端会调用 UDP `connect()`。后续发送时无需再传目标地址，且不能为单次发送指定其他目标。

```ts
const client = await this.udpService.createClient({
  remote: { address: '127.0.0.1', port: 9000 },
  onMessage: (message, remote) => {
    console.log(`收到 ${remote.address}:${remote.port} 的响应：${message.toString('utf8')}`);
  },
});

const sentBytes = await client.send('hello');
console.log(`已交给操作系统 ${sentBytes} 字节`);
```

### 未连接客户端

不配置 `remote` 时，每次发送都必须传入 `target`，适用于同一 Socket 向多个目标发送数据。

```ts
const client = await this.udpService.createClient();

await client.send('first', { address: '192.168.1.10', port: 9000 });
await client.send('second', { address: '192.168.1.11', port: 9000 });
```

### 固定本地端口

需要固定数据报的源端口时，使用客户端 `bind`。

```ts
const client = await this.udpService.createClient({
  bind: { address: '0.0.0.0', port: 10000 },
  remote: { address: '192.168.1.10', port: 9000 },
});
```

## 不依赖 NestJS 直接使用

也可直接创建 `UdpServer` 或 `UdpClient`。此时不会由 `UdpService` 托管，调用方必须在 `finally` 中主动关闭。

```ts
import { UdpClient } from '@/infrastructure/udp';

const client = await UdpClient.create({
  remote: { address: '127.0.0.1', port: 9000 },
});

try {
  await client.send(Buffer.from('hello'));
} finally {
  await client.close();
}
```

## API 说明

### `UdpServerOptions`

| 字段             | 类型                                         | 必填 | 说明                                  |
| ---------------- | -------------------------------------------- | ---- | ------------------------------------- |
| `bind`           | `number \| BindOptions`                      | 是   | 监听端口或完整绑定参数                |
| `type`           | `'udp4' \| 'udp6'`                           | 否   | 地址族，默认 `udp4`                   |
| `socketOptions`  | `Omit<SocketOptions, 'type'>`                | 否   | 透传给 `node:dgram.createSocket()`    |
| `onMessage`      | `(message, remote) => void \| Promise<void>` | 否   | 数据报处理器                          |
| `onHandlerError` | `(error, remote) => void`                    | 否   | `onMessage` 返回的 Promise 拒绝时调用 |

### `UdpClientOptions`

| 字段             | 类型                                         | 必填 | 说明                               |
| ---------------- | -------------------------------------------- | ---- | ---------------------------------- |
| `bind`           | `number \| BindOptions`                      | 否   | 可选的本地绑定配置                 |
| `remote`         | `{ address: string; port: number }`          | 否   | 默认远端；配置后为已连接客户端     |
| `type`           | `'udp4' \| 'udp6'`                           | 否   | 地址族，默认 `udp4`                |
| `socketOptions`  | `Omit<SocketOptions, 'type'>`                | 否   | 透传给 `node:dgram.createSocket()` |
| `onMessage`      | `(message, remote) => void \| Promise<void>` | 否   | 处理响应或远端主动推送             |
| `onHandlerError` | `(error, remote) => void`                    | 否   | 消息处理失败时调用                 |

### 公共方法

| 对象                      | 方法                     | 说明                                 |
| ------------------------- | ------------------------ | ------------------------------------ |
| `UdpService`              | `createServer(options)`  | 创建并托管服务端                     |
| `UdpService`              | `createClient(options?)` | 创建并托管客户端                     |
| `UdpServer`               | `send(message, target)`  | 向指定目标发送数据报，返回发送字节数 |
| `UdpClient`               | `send(message, target?)` | 发送数据报，返回发送字节数           |
| `UdpServer` / `UdpClient` | `address()`              | 返回 Socket 的本地地址               |
| `UdpServer` / `UdpClient` | `close()`                | 关闭 Socket；可安全重复调用          |

`UdpMessage` 支持 `string` 、`Uint8Array` 和 `readonly Uint8Array[]`。接收到的消息始终是 `Buffer`。

## 错误处理

- Socket 自身的 `error` 事件会通过 Nest `Logger` 记录。
- `onMessage` 可以是异步函数，其 Promise 拒绝不会变成未处理 Promise。
- 配置 `onHandlerError` 后，异步消息处理错误会交给该回调；否则由默认 Logger 记录。
- 普通非 `async` 处理器的同步抛错目前不会进入 `onHandlerError`。需要统一错误处理时，请将 `onMessage` 声明为 `async` 或在处理器内使用 `try/catch`。
- `createServer()` 绑定失败或 `createClient()` 绑定/连接失败时，已创建的 Socket 会尽力自动释放。
- `send()` 成功仅表示数据已交给本机操作系统，不代表远端已收到。

## UDP 使用注意事项

- UDP 不保证送达、顺序或去重。需要可靠传输时，应在应用层实现超时、序列号、确认和重试，或改用 TCP。
- 数据报可能因超过网络 MTU 被分片或丢弃。建议保持单个报文较小，大数据请在应用层分包。
- 绑定 `0.0.0.0` 或 `::` 会对所有网卡开放端口。生产环境应配置防火墙、限制来源，并对报文执行长度、格式和身份校验。
- UDP 没有内建加密和身份认证。敏感数据需使用经过审核的安全协议，不应自行设计加密格式。
- `onMessage` 会对每个数据报独立调用；如果处理逻辑耗时或可能高并发，应增加限流、队列或并发控制。

## 测试

运行 UDP 模块的回环测试：

```bash
pnpm test -- udp.service.spec.ts --runInBand
```

测试使用 `127.0.0.1` 和操作系统分配的随机端口（`port: 0`），不依赖外部网络。
