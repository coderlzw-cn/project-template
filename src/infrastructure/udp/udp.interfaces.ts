import type { BindOptions, RemoteInfo, SocketOptions, SocketType } from 'node:dgram';

/** UDP 可发送的数据类型。 */
export type UdpMessage = string | Uint8Array | readonly Uint8Array[];

/** UDP 目标地址。 */
export interface UdpRemoteAddress {
  port: number;
  address: string;
}

export interface UdpSocketConfig {
  /** 地址族，默认使用 udp4。 */
  type?: SocketType;
  /** 直接透传给 node:dgram createSocket 的其余选项。 */
  socketOptions?: Omit<SocketOptions, 'type'>;
}

export interface UdpServerOptions extends UdpSocketConfig {
  /** 服务端监听配置。 */
  bind: number | BindOptions;
  /** 收到数据报时调用；异步处理失败会交给 onHandlerError。 */
  onMessage?: UdpMessageHandler;
  /** 消息处理器抛错时调用，默认记录错误日志。 */
  onHandlerError?: (error: unknown, remote: RemoteInfo) => void;
}

export interface UdpClientOptions extends UdpSocketConfig {
  /** 可选的本地绑定配置；需要固定源端口时使用。 */
  bind?: number | BindOptions;
  /** 可选的默认远端；设置后客户端会调用 connect。 */
  remote?: UdpRemoteAddress;
  /** 收到数据报时调用；适用于需要接收响应或服务端主动推送的客户端。 */
  onMessage?: UdpMessageHandler;
  /** 消息处理器抛错时调用，默认记录错误日志。 */
  onHandlerError?: (error: unknown, remote: RemoteInfo) => void;
}

export type UdpMessageHandler = (message: Buffer, remote: RemoteInfo) => void | Promise<void>;
