// import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit, Optional } from '@nestjs/common';
// import { EventEmitter2 } from '@nestjs/event-emitter';
// import dgram, { type RemoteInfo } from 'node:dgram';
// import { type UdpModuleOptions, UdpBaseConfig, UdpMessagePayload } from './udp.interface';
// import { MODULE_OPTIONS_TOKEN } from './udp.module-definition';

// @Injectable()
// export class UdpService implements OnModuleInit, OnModuleDestroy {
//   private readonly logger = new Logger(UdpService.name);
//   private readonly sockets = new Map<string, dgram.Socket>();

//   constructor(
//     @Inject(MODULE_OPTIONS_TOKEN) private readonly options: UdpModuleOptions,
//     @Optional() private readonly eventEmitter?: EventEmitter2,
//   ) {}

//   onModuleInit() {
//     this.options.servers?.forEach((config) => this.createSocket(config, true));
//     this.options.clients?.forEach((config) => this.createSocket(config, false));
//   }

//   /**
//    * 判断是否应该打印 debug 日志
//    * @param config socket 配置
//    * @returns 是否应该打印 debug 日志
//    */
//   private shouldDebug(config: UdpBaseConfig): boolean {
//     // 如果配置中明确指定了 debug，使用配置的值
//     if (config.debug !== undefined) {
//       return config.debug;
//     }
//     // 否则使用全局配置，默认为 true
//     return this.options.debug !== false;
//   }

//   private createSocket(config: UdpBaseConfig, isServer: boolean) {
//     const socketType = config.type || 'udp4';
//     const socket = dgram.createSocket(socketType);

//     socket.on('message', (msg: Buffer, rinfo: RemoteInfo) => {
//       // 1. 打印基础日志
//       if (this.shouldDebug(config)) {
//         this.logger.debug(`[${config.name}] Recv ${msg.length} bytes from ${rinfo.address}:${rinfo.port}`);
//       }

//       // 2. 发送事件 (事件名格式: udp.message.CONFIG_NAME)
//       if (this.options.emitEvents !== false && this.eventEmitter) {
//         const payload: UdpMessagePayload = {
//           name: config.name,
//           msg,
//           remoteInfo: rinfo,
//         };
//         this.eventEmitter.emit(`udp.message.${config.name}`, payload);
//       }
//     });

//     socket.on('error', (err: Error) => {
//       this.logger.error(`[${config.name}] Socket error: ${err.message}`, err.stack);
//     });

//     socket.on('close', () => {
//       this.logger.log(`[${config.name}] Socket closed`);
//     });

//     socket.on('listening', () => {
//       const address = socket.address();
//       this.logger.log(`[${config.name}] Socket listening on ${address.address}:${address.port}`);
//     });

//     if (isServer) {
//       socket.bind(config.port, config.host || '0.0.0.0', (err?: Error) => {
//         if (err) {
//           this.logger.error(`[${config.name}] Failed to bind: ${err.message}`, err.stack);
//         } else {
//           this.logger.log(`UDP Server [${config.name}] listening on ${config.port}`);
//         }
//       });
//     }

//     this.sockets.set(config.name, socket);
//   }

//   /**
//    * 发送 UDP 消息
//    * @param name socket 配置名称
//    * @param message 要发送的消息（字符串或 Buffer）
//    * @param port 目标端口（可选，如果 socket 是 client 类型且已配置，则使用配置的端口）
//    * @param host 目标主机（可选，如果 socket 是 client 类型且已配置，则使用配置的主机）
//    * @returns Promise<boolean> 发送成功返回 true
//    */
//   async send(name: string, message: string | Buffer, port?: number, host?: string): Promise<boolean> {
//     const socket = this.sockets.get(name);
//     if (!socket) {
//       throw new Error(`UDP Socket ${name} not found`);
//     }

//     const clientConfig = this.options.clients?.find((c) => c.name === name);
//     const targetPort: number = port ?? clientConfig?.port ?? 0;
//     const targetHost: string = host ?? clientConfig?.host ?? '';

//     if (!targetPort || !targetHost) {
//       throw new Error(`Target port/host missing for ${name}. Please provide port and host parameters or configure client with host and port.`);
//     }

//     const messageBuffer = Buffer.isBuffer(message) ? message : Buffer.from(message);
//     return new Promise<boolean>((resolve, reject) => {
//       // 使用类型断言确保 TypeScript 正确匹配 send 方法的重载
//       type UdpSendFn = (msg: Buffer, port: number, address: string, callback?: (err?: Error) => void) => void;

//       (socket.send as UdpSendFn)(messageBuffer, targetPort, targetHost, (err?: Error) => {
//         if (err) {
//           this.logger.error(`[${name}] Failed to send message: ${err.message}`, err.stack);
//           reject(err);
//         } else {
//           // 获取配置以判断是否打印 debug 日志
//           const config = this.options.servers?.find((c) => c.name === name) || this.options.clients?.find((c) => c.name === name);
//           if (config && this.shouldDebug(config)) {
//             this.logger.debug(`[${name}] Sent ${messageBuffer.length} bytes to ${targetHost}:${targetPort}`);
//           }
//           resolve(true);
//         }
//       });
//     });
//   }

//   /**
//    * 获取 socket 状态
//    * @param name socket 配置名称
//    * @returns socket 地址信息，如果 socket 不存在或未绑定则返回 null
//    */
//   getSocketAddress(name: string): ReturnType<dgram.Socket['address']> | null {
//     const socket = this.sockets.get(name);
//     if (!socket) {
//       return null;
//     }
//     try {
//       return socket.address();
//     } catch {
//       return null;
//     }
//   }

//   /**
//    * 检查 socket 是否存在
//    * @param name socket 配置名称
//    * @returns 是否存在
//    */
//   hasSocket(name: string): boolean {
//     return this.sockets.has(name);
//   }

//   /**
//    * 关闭指定的 socket
//    * @param name socket 配置名称
//    * @returns Promise<void>
//    */
//   async closeSocket(name: string): Promise<void> {
//     const socket = this.sockets.get(name);
//     if (!socket) {
//       throw new Error(`UDP Socket ${name} not found`);
//     }

//     return new Promise<void>((resolve, reject) => {
//       socket.close((err?: Error) => {
//         if (err) {
//           this.logger.error(`[${name}] Failed to close socket: ${err.message}`, err.stack);
//           reject(err);
//         } else {
//           this.sockets.delete(name);
//           this.logger.log(`[${name}] Socket closed successfully`);
//           resolve();
//         }
//       });
//     });
//   }

//   /**
//    * 获取所有 socket 名称列表
//    * @returns socket 名称数组
//    */
//   getSocketNames(): string[] {
//     return Array.from(this.sockets.keys());
//   }

//   async onModuleDestroy() {
//     this.logger.log('Closing all UDP sockets...');
//     const closePromises: Promise<void>[] = [];

//     for (const [name, socket] of this.sockets) {
//       closePromises.push(
//         new Promise<void>((resolve) => {
//           socket.close((err?: Error) => {
//             if (err) {
//               this.logger.error(`[${name}] Failed to close socket during shutdown: ${err.message}`, err.stack);
//             } else {
//               this.logger.log(`[${name}] Socket closed`);
//             }
//             resolve();
//           });
//         }),
//       );
//     }

//     await Promise.all(closePromises);
//     this.sockets.clear();
//     this.logger.log('All UDP sockets closed');
//   }
// }
