/**
 * 健壮的 WebSocket 客户端封装 (v2.4 - 原生类型对齐版)
 */

/** 事件数据映射表 (对齐原生 WebSocket 类型) */
export interface WSEventMap<T = any> {
  open: Event;
  message: MessageEvent<T>; // 对应原生 onmessage 的 MessageEvent
  close: CloseEvent;        // 对应原生 onclose 的 CloseEvent
  error: Event;             // 对应原生 onerror 的 Event
  connecting: null;
  reconnecting: { attempt: number; delay: number };
  reconnected: null;
}

export type WSEventType = keyof WSEventMap;
export type WSEventCallback<T> = (data: T) => void;

export interface WSClientOptions {
  /** 基础重连间隔 (ms)，默认 1000 */
  reconnectInterval?: number;
  /** 最大重连次数，默认 10 */
  maxReconnectAttempts?: number;
  /** 心跳发送间隔 (ms)，默认 30000 */
  pingInterval?: number;
  /** 心跳响应 (Pong) 超时时间 (ms)，默认 5000 */
  pongTimeout?: number;
  /** 握手超时时间 (ms)，默认 5000 */
  handshakeTimeout?: number;
  /** Ack 确认回执超时时间 (ms)，默认 30000 */
  ackTimeout?: number;
  /** Ack ID 的字段名，默认 'ack_id' */
  ackIdKey?: string;
  /** 是否启用单例模式 */
  singleton?: boolean;
  /** 是否开启调试日志 */
  debug?: boolean;
  /** WebSocket 子协议 */
  protocols?: string | string[];
  /** 二进制数据类型，默认 'blob' */
  binaryType?: BinaryType;
  /** 是否启用离线消息暂存，默认 true */
  useStash?: boolean;
  /** 暂存队列最大容量，默认 100 */
  maxStashSize?: number;
  /** 队列满时的策略，默认 'drop-oldest' */
  stashStrategy?: 'drop-oldest' | 'drop-newest';
  /** 暂存消息有效期 (ms)，0 表示永不过期，默认 60000 */
  stashTTL?: number;
}

/** 暂存消息定义 */
interface StashedMessage {
  type: 'fire-and-forget' | 'await-ack';
  payload: any;
  timestamp: number;
  resolve?: (value: any) => void;
  reject?: (reason?: any) => void;
}

/** 待处理的确认回执 */
interface PendingAck<T = any> {
  resolve: (value: T) => void;
  reject: (reason?: any) => void;
  timer: ReturnType<typeof setTimeout>;
}

export default class WSClient<TMsg = any> {
  static instance: WSClient | null = null;
  private url: string = '';

  private options: Required<WSClientOptions> = {
    reconnectInterval: 1000,
    maxReconnectAttempts: 10,
    pingInterval: 30000,
    pongTimeout: 5000,
    handshakeTimeout: 5000,
    ackTimeout: 30000,
    ackIdKey: 'ack_id',
    singleton: false,
    debug: false,
    binaryType: 'blob',
    protocols: [],
    useStash: true,
    maxStashSize: 100,
    stashStrategy: 'drop-oldest',
    stashTTL: 60000,
  };

  private socket: WebSocket | null = null;
  private reconnectCount: number = 0;
  private timers: Record<string, any> = { ping: null, reconnect: null, handshake: null, pong: null };

  private events: Partial<Record<WSEventType, WSEventCallback<any>[]>> = {};
  private pendingAcks = new Map<string, PendingAck>();
  private stash: StashedMessage[] = [];
  private ackCounter: number = 0;

  constructor(url: string, options: WSClientOptions = {}) {
    if (options.singleton && WSClient.instance) return WSClient.instance as WSClient<TMsg>;
    this.url = url;
    this.options = { ...this.options, ...options };
    if (options.singleton) WSClient.instance = this;
  }

  private log(message: string, ...args: any[]): void {
    if (this.options.debug) {
      console.log(`%c[WS] ${message}`, 'color: #4CAF50; font-weight: bold', ...args);
    }
  }

  /**
   * 执行协议握手并建立连接
   */
  connect(): void {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.log('Initiating handshake...', this.url);
    this.emit('connecting', null);

    this.socket = new WebSocket(this.url, this.options.protocols);
    this.socket.binaryType = this.options.binaryType;

    this.timers.handshake = setTimeout(() => {
      if (this.socket?.readyState === WebSocket.CONNECTING) {
        this.log('Handshake timeout, aborting');
        this.terminate();
      }
    }, this.options.handshakeTimeout);

    this.socket.onopen = (e) => {
      this.log('Connection established');
      this.clearAllTimers();
      const isReconnected = this.reconnectCount > 0;
      this.reconnectCount = 0;
      this.startKeepAlive();
      this.resendStash();
      this.emit('open', e);
      if (isReconnected) this.emit('reconnected', null);
    };

    this.socket.onmessage = (e: MessageEvent) => {
      this.resetKeepAliveTimeout();

      // 内部处理 Ack 逻辑（仍需解析数据）
      try {
        const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if (data && data[this.options.ackIdKey]) {
          this.handleAck(data);
        }
      } catch (err) {
        // 解析失败不影响事件分发
      }

      // 按照原生 WebSocket 行为，分发原始 MessageEvent
      this.emit('message', e as MessageEvent<TMsg>);
    };

    this.socket.onclose = (e) => {
      this.log('Socket closed', `Code: ${e.code}`);
      this.stopKeepAlive();
      this.emit('close', e);
      if (this.reconnectCount < this.options.maxReconnectAttempts) {
        this.scheduleReconnect();
      }
    };

    this.socket.onerror = (e) => {
      this.log('Socket error detected');
      this.emit('error', e);
    };
  }

  /**
   * 发送消息（不等待回执）
   */
  send<T extends string | ArrayBufferLike | Blob | ArrayBufferView | object>(payload: T): void {
    if (this.isReady()) {
      let data: any;
      if (typeof payload === 'object' && !(payload instanceof Blob || payload instanceof ArrayBuffer || ArrayBuffer.isView(payload))) {
        data = JSON.stringify(payload);
      } else {
        data = payload;
      }
      this.socket!.send(data);
    } else if (this.options.useStash) {
      this.addToStash({ type: 'fire-and-forget', payload });
    }
  }

  /**
   * 发送消息并等待服务端确认 (Ack)
   */
  sendWithAck<TResponse = any, TRequest = any>(payload: TRequest): Promise<TResponse> {
    const ackId = `ack_${Date.now()}_${++this.ackCounter}`;
    const ackKey = this.options.ackIdKey;

    if (!this.isReady()) {
      if (this.options.useStash) {
        return new Promise((resolve, reject) => {
          this.addToStash({
            type: 'await-ack',
            payload: { ...payload, [ackKey]: ackId },
            resolve,
            reject
          });
        });
      }
      return Promise.reject(new Error('Connection not ready'));
    }

    return new Promise<TResponse>((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this.pendingAcks.has(ackId)) {
          this.pendingAcks.delete(ackId);
          reject(new Error(`Ack timeout: ${ackId}`));
        }
      }, this.options.ackTimeout);

      this.pendingAcks.set(ackId, { resolve, reject, timer });
      this.socket!.send(JSON.stringify({ ...payload, [ackKey]: ackId }));
    });
  }

  private scheduleReconnect(): void {
    this.reconnectCount++;
    const delay = Math.min(this.options.reconnectInterval * Math.pow(2, this.reconnectCount - 1), 30000)
      + Math.floor(Math.random() * 500);

    this.log(`Scheduling reconnect in ${delay}ms`);
    this.emit('reconnecting', { attempt: this.reconnectCount, delay });
    this.timers.reconnect = setTimeout(() => this.connect(), delay);
  }

  private startKeepAlive(): void {
    this.timers.ping = setInterval(() => {
      if (this.isReady()) {
        this.send({ type: 'ping' });
        this.timers.pong = setTimeout(() => {
          this.log('Keep-alive timeout, terminating');
          this.terminate();
        }, this.options.pongTimeout);
      }
    }, this.options.pingInterval);
  }

  private resetKeepAliveTimeout(): void {
    if (this.timers.pong) {
      clearTimeout(this.timers.pong);
      this.timers.pong = null;
    }
  }

  private stopKeepAlive(): void {
    if (this.timers.ping) clearInterval(this.timers.ping);
    this.resetKeepAliveTimeout();
  }

  private addToStash(item: Omit<StashedMessage, 'timestamp'>): void {
    if (this.stash.length >= this.options.maxStashSize) {
      const removed = this.options.stashStrategy === 'drop-oldest' ? this.stash.shift() : item;
      removed?.reject?.(new Error('Stash overflow'));
      if (this.options.stashStrategy === 'drop-newest') return;
    }
    this.stash.push({ ...item, timestamp: Date.now() });
  }

  private async resendStash(): Promise<void> {
    const queue = [...this.stash];
    this.stash = [];
    for (const item of queue) {
      if (this.options.stashTTL > 0 && (Date.now() - item.timestamp > this.options.stashTTL)) {
        item.reject?.(new Error('Message expired in stash'));
        continue;
      }
      item.type === 'fire-and-forget'
        ? this.send(item.payload)
        : this.sendWithAck(item.payload).then(item.resolve).catch(item.reject);
      await new Promise(r => setTimeout(r, 20));
    }
  }

  private handleAck(data: any): void {
    const id = data[this.options.ackIdKey];
    const pending = this.pendingAcks.get(id);
    if (pending) {
      clearTimeout(pending.timer);
      this.pendingAcks.delete(id);
      pending.resolve(data);
    }
  }

  private terminate(): void {
    if (this.socket) {
      this.socket.onopen = this.socket.onmessage = this.socket.onclose = this.socket.onerror = null;
      this.socket.close();
      this.socket = null;
    }
  }

  disconnect(): void {
    this.reconnectCount = this.options.maxReconnectAttempts;
    this.clearAllTimers();
    this.pendingAcks.forEach(a => { clearTimeout(a.timer); a.reject(new Error('Closed')); });
    this.pendingAcks.clear();
    this.terminate();
  }

  private clearAllTimers(): void {
    Object.keys(this.timers).forEach(k => {
      clearTimeout(this.timers[k]);
      clearInterval(this.timers[k]);
      this.timers[k] = null;
    });
  }

  isReady(): boolean { return this.socket?.readyState === WebSocket.OPEN; }

  /** 监听事件 */
  on<K extends WSEventType, T = WSEventMap<TMsg>[K]>(event: K, cb: WSEventCallback<T>): void {
    (this.events[event] ||= [] as unknown as WSEventCallback<T>[]).push(cb);
  }

  /** 移除事件监听 */
  off<K extends WSEventType, T = WSEventMap<TMsg>[K]>(event: K, cb?: WSEventCallback<T>): void {
    if (!this.events[event]) return;
    if (cb) {
      this.events[event] = this.events[event]!.filter(i => i !== cb);
    } else {
      this.events[event] = [];
    }
  }

  private emit<K extends WSEventType>(event: K, data: WSEventMap<TMsg>[K]): void {
    this.events[event]?.forEach(cb => cb(data));
  }
}
