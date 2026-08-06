import type { BindOptions, Socket } from 'node:dgram';

/** 将 dgram 的回调式 bind 转为 Promise，并正确处理绑定阶段错误。 */
export function bindSocket(socket: Socket, bind: number | BindOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    const onError = (error: Error) => {
      socket.off('listening', onListening);
      reject(error);
    };
    const onListening = () => {
      socket.off('error', onError);
      resolve();
    };

    socket.once('error', onError);
    socket.once('listening', onListening);
    if (typeof bind === 'number') socket.bind(bind);
    else socket.bind(bind);
  });
}

/** 将 dgram 的回调式 connect 转为 Promise。 */
export function connectSocket(socket: Socket, port: number, address: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const onError = (error: Error) => {
      socket.off('connect', onConnect);
      reject(error);
    };
    const onConnect = () => {
      socket.off('error', onError);
      resolve();
    };

    socket.once('error', onError);
    socket.once('connect', onConnect);
    socket.connect(port, address);
  });
}

export function closeSocket(socket: Socket): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      socket.close(resolve);
    } catch (error) {
      reject(error instanceof Error ? error : new Error(String(error)));
    }
  });
}

/** 创建失败时尽力释放 Socket，避免清理异常覆盖原始错误。 */
export function closeSocketQuietly(socket: Socket): void {
  try {
    socket.close();
  } catch {
    // Socket 尚未开始监听时无需关闭。
  }
}
