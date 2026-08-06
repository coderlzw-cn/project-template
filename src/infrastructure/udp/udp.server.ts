import { Logger } from '@nestjs/common';
import { createSocket, type RemoteInfo, type Socket } from 'node:dgram';
import type { UdpMessage, UdpRemoteAddress, UdpServerOptions } from './udp.interfaces';
import { bindSocket, closeSocket, closeSocketQuietly } from './udp.utils';

export class UdpServer {
  private readonly logger = new Logger(UdpServer.name);
  private closed = false;

  private constructor(
    readonly socket: Socket,
    private readonly options: Readonly<UdpServerOptions>,
    private readonly onClose: () => void,
  ) {}

  static async create(options: UdpServerOptions, onClose: () => void = () => undefined): Promise<UdpServer> {
    const socket = createSocket({ type: options.type ?? 'udp4', ...options.socketOptions });
    const server = new UdpServer(socket, options, onClose);
    server.registerListeners();

    try {
      await bindSocket(socket, options.bind);
      return server;
    } catch (error) {
      closeSocketQuietly(socket);
      throw error;
    }
  }

  /** 当前监听地址；仅在服务端创建成功后调用。 */
  address() {
    return this.socket.address();
  }

  /** 向指定目标发送数据报。 */
  send(message: UdpMessage, target: UdpRemoteAddress): Promise<number> {
    return new Promise((resolve, reject) => {
      this.socket.send(message, target.port, target.address, (error, bytes) => (error ? reject(error) : resolve(bytes)));
    });
  }

  /** 关闭服务端；重复调用不会产生副作用。 */
  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    try {
      await closeSocket(this.socket);
    } finally {
      this.onClose();
    }
  }

  private registerListeners() {
    this.socket.on('message', (message, remote) => {
      if (!this.options.onMessage) return;
      void Promise.resolve(this.options.onMessage(message, remote)).catch((error: unknown) => this.handleMessageError(error, remote));
    });
    this.socket.on('error', (error) => this.logger.error(`UDP 服务端 Socket 错误：${error.message}`, error.stack));
  }

  private handleMessageError(error: unknown, remote: RemoteInfo) {
    if (this.options.onHandlerError) {
      this.options.onHandlerError(error, remote);
      return;
    }
    const detail = error instanceof Error ? error.stack : String(error);
    this.logger.error(`UDP 消息处理失败：${remote.address}:${remote.port}`, detail);
  }
}
