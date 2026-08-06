import { Injectable, type OnApplicationShutdown } from '@nestjs/common';
import { UdpClient } from './udp.client';
import type { UdpClientOptions, UdpServerOptions } from './udp.interfaces';
import { UdpServer } from './udp.server';

type ManagedEndpoint = UdpClient | UdpServer;

/** 创建并集中管理 UDP 服务端及客户端。 */
@Injectable()
export class UdpService implements OnApplicationShutdown {
  private readonly endpoints = new Set<ManagedEndpoint>();

  async createServer(options: UdpServerOptions): Promise<UdpServer> {
    const server = await UdpServer.create(options, () => this.endpoints.delete(server));
    this.endpoints.add(server);
    return server;
  }

  async createClient(options: UdpClientOptions = {}): Promise<UdpClient> {
    const client = await UdpClient.create(options, () => this.endpoints.delete(client));
    this.endpoints.add(client);
    return client;
  }

  /** Nest 应用退出时释放仍由模块管理的全部 UDP Socket。 */
  async onApplicationShutdown(): Promise<void> {
    const endpoints = [...this.endpoints];
    await Promise.allSettled(endpoints.map((endpoint) => endpoint.close()));
  }
}
