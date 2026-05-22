// import type { RemoteInfo } from 'node:dgram';

// export type UdpSocketType = 'udp4' | 'udp6';

// export interface UdpBaseConfig {
//   name: string;
//   port: number;
//   host?: string;
//   type?: UdpSocketType; // UDP socket 类型，默认为 'udp4'
//   debug?: boolean; // 是否启用该 socket 的 debug 日志，默认使用全局配置
// }

// export type UdpServerConfig = UdpBaseConfig;
// export interface UdpClientConfig extends UdpBaseConfig {
//   host: string;
// }

// export interface UdpModuleOptions {
//   servers?: UdpServerConfig[];
//   clients?: UdpClientConfig[];
//   // 是否启用全局事件发送，默认建议开启
//   emitEvents?: boolean;
//   // 是否启用全局 debug 日志，默认为 true。单个 socket 可以通过 debug 选项覆盖此设置
//   debug?: boolean;
// }

// // 定义事件载荷结构
// export interface UdpMessagePayload {
//   name: string; // 哪个配置收到的
//   msg: Buffer; // 原始数据
//   remoteInfo: RemoteInfo; // 远程发送者信息 (address, family, port, size)
// }
