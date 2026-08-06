import { Logger } from '@nestjs/common';
import { createSocket, type RemoteInfo, type Socket } from 'node:dgram';
import type { UdpClientOptions, UdpMessage, UdpRemoteAddress } from './udp.interfaces';
import { bindSocket, closeSocket, closeSocketQuietly, connectSocket } from './udp.utils';

export class UdpClient {
  private readonly logger = new Logger(UdpClient.name);
  private closed = false;

  private constructor(
    readonly socket: Socket,
    private readonly connected: boolean,
    private readonly options: Readonly<UdpClientOptions>,
    private readonly onClose: () => void,
  ) {}

  static async create(options: UdpClientOptions = {}, onClose: () => void = () => undefined): Promise<UdpClient> {
    const socket = createSocket({ type: options.type ?? 'udp4', ...options.socketOptions });
    const client = new UdpClient(socket, options.remote !== undefined, options, onClose);
    socket.on('error', (error) => client.logger.error(`UDP 客户端 Socket 错误：${error.message}`, error.stack));
    socket.on('message', (message, remote) => {
      if (!options.onMessage) return;
      void Promise.resolve(options.onMessage(message, remote)).catch((error: unknown) => client.handleMessageError(error, remote));
    });

    try {
      if (options.bind !== undefined) await bindSocket(socket, options.bind);
      if (options.remote) await connectSocket(socket, options.remote.port, options.remote.address);
      return client;
    } catch (error) {
      closeSocketQuietly(socket);
      throw error;
    }
  }

  /** 本地地址；未绑定且尚未发送数据时，Node.js 可能抛出未运行错误。 */
  address() {
    return this.socket.address();
  }

  /**
   * 发送数据报。已配置默认远端时无需传 target；未配置时必须提供目标地址。
   */
  send(message: UdpMessage, target?: UdpRemoteAddress): Promise<number> {
    if (this.connected && target) return Promise.reject(new Error('已连接的 UDP 客户端不能为单次发送指定其他目标'));
    if (!this.connected && !target) return Promise.reject(new Error('未配置默认远端，发送 UDP 数据时必须指定 target'));

    return new Promise((resolve, reject) => {
      const callback = (error: Error | null, bytes: number) => (error ? reject(error) : resolve(bytes));
      if (target) this.socket.send(message, target.port, target.address, callback);
      else this.socket.send(message, callback);
    });
  }

  /** 关闭客户端；重复调用不会产生副作用。 */
  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    try {
      await closeSocket(this.socket);
    } finally {
      this.onClose();
    }
  }

  private handleMessageError(error: unknown, remote: RemoteInfo) {
    if (this.options.onHandlerError) {
      this.options.onHandlerError(error, remote);
      return;
    }
    const detail = error instanceof Error ? error.stack : String(error);
    this.logger.error(`UDP 客户端消息处理失败：${remote.address}:${remote.port}`, detail);
  }
}
