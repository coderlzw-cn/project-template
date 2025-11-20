/**
 * 配置选项接口
 */
interface RobustWebSocketOptions {
  /** WebSocket 服务器地址 */
  url: string;
  /** 最大重连次数 (0 为无限次)，默认为 5 */
  maxReconnectAttempts?: number;
  /** 心跳间隔 (ms)，默认为 30000 */
  heartbeatInterval?: number;
  /** 等待 pong 的超时时间 (ms)，默认为 5000 */
  pongTimeout?: number;
  /** 是否开启内置心跳 (默认开启) */
  heartbeatEnabled?: boolean;
  /** 自定义重连延迟函数 (attemptCount: number) => delayMs: number */
  getReconnectDelay?: (attemptCount: number) => number;
  /** 自定义的 Ping 消息体 (字符串或对象)，默认为 'ping' */
  pingMessage?: string | object;
  /** 自定义的 Pong 识别函数 (data: unknown) => boolean */
  isPong?: (data: unknown) => boolean;
}

/**
 * RobustWebSocket 封装类
 * 实现了自动重连、消息缓冲、可配置心跳、灵活事件绑定和状态查询，并支持单例模式。
 */

type KnownEventName = 'open' | 'message' | 'close' | 'error' | 'ping' | 'pong';
type AnyEventName = KnownEventName | (string & {});

type ListenerArgs<E extends string> =
  E extends 'open' ? [Event] :
    E extends 'message' ? [MessageEvent] :
      E extends 'close' ? [CloseEvent] :
        E extends 'error' ? [Event | Error] :
          E extends 'ping' ? [string] :
            E extends 'pong' ? [unknown] :
              unknown[];

type ListenerCallback<E extends string = string> = (...args: ListenerArgs<E>) => void;

interface ListenerEntry {
  callback: ListenerCallback;
  type: 'on' | 'once';
}

export class RobustWebSocket {

  // --- 【单例控制】静态属性 ---
  private static instance: RobustWebSocket | null = null;
  // ----------------------------

  private ws: WebSocket | null = null;
  private readonly url: string;
  private listeners: Map<string, Array<ListenerEntry>> = new Map();
  private sendQueue: Array<string | object> = [];

  private shouldReconnect: boolean = true;
  private reconnectAttempts: number = 0;
  private readonly maxReconnectAttempts: number = 5;

  private heartbeatTimer: number | null = null; // 浏览器环境使用 number
  private pongTimeoutTimer: number | null = null; // 浏览器环境使用 number
  private readonly heartbeatInterval: number = 30000;
  private readonly pongTimeout: number = 5000;
  private readonly heartbeatEnabled: boolean = true;

  private isConnecting: boolean = false;

  // --- 灵活配置属性 ---
  private readonly getReconnectDelayFn: ((attemptCount: number) => number) | null = null;
  private readonly customPingMessage: string | object = 'ping';
  private readonly isPongFn: ((data: unknown) => boolean) | null = null;
  // --------------------

  /**
   * 构造函数。使用 new RobustWebSocket(...) 创建非单例实例。
   */
  constructor(url: string, options: Omit<RobustWebSocketOptions, 'url'> = {}) {
    if (!url) {
      throw new Error('WebSocket URL is required.');
    }
    this.url = url;

    this.maxReconnectAttempts = options.maxReconnectAttempts ?? 5;
    this.heartbeatInterval = options.heartbeatInterval ?? 30000;
    this.pongTimeout = options.pongTimeout ?? 5000;
    this.heartbeatEnabled = options.heartbeatEnabled ?? true;

    this.getReconnectDelayFn = options.getReconnectDelay ?? null;
    this.customPingMessage = options.pingMessage !== undefined ? options.pingMessage : 'ping';
    this.isPongFn = options.isPong ?? null;

    this.listeners.set('message', []);
  }

  // --- 【单例控制】静态方法 ---

  /**
   * 获取 RobustWebSocket 实例的静态方法 (单例模式的入口)。
   * @param url - WebSocket 服务器地址 (仅在首次创建时需要)
   * @param options - 配置选项 (仅在首次创建时需要)
   * @returns 唯一的 RobustWebSocket 实例
   */
  public static getInstance(url: string, options: Omit<RobustWebSocketOptions, 'url'> = {}): RobustWebSocket {
    if (!RobustWebSocket.instance) {
      if (!url) {
        throw new Error("首次调用 getInstance() 必须提供 URL 参数来创建实例。");
      }
      console.log('RobustWebSocket: 创建新的单例实例...');
      RobustWebSocket.instance = new RobustWebSocket(url, options);
    } else {
      // 实例已存在，忽略新的参数
      if (RobustWebSocket.instance.url !== url) {
        console.warn(`RobustWebSocket: 单例已存在，忽略本次调用中的新 URL (${url})。正在返回现有实例。`);
      }
    }
    return RobustWebSocket.instance;
  }

  // --- 状态查询属性 (Getters) ---

  /**
   * 获取当前连接是否处于开启状态
   */
  public get isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * 获取 WebSocket 的 readyState (0:CONNECTING, 1:OPEN, 2:CLOSING, 3:CLOSED)
   */
  public get readyState(): number {
    return this.ws ? this.ws.readyState : WebSocket.CLOSED;
  }

  // --- 核心方法 ---

  /** @private 触发事件 */
  private emit<E extends AnyEventName>(eventName: E, ...args: ListenerArgs<E>): void {
    // 触发普通监听器
    const currentListeners = this.listeners.get(eventName) || [];
    currentListeners.forEach(l => (l.callback as ListenerCallback<E>)(...args));

    // 触发 once 监听器，并移除
    const onceListeners = (this.listeners.get(`once:${eventName}`) || []);
    onceListeners.forEach(l => (l.callback as ListenerCallback<E>)(...args));
    this.listeners.set(`once:${eventName}`, []);
  }

  /**
   * 建立连接
   * @param isReconnect - 是否是重连
   */
  public connect(isReconnect: boolean = false): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      console.warn('WebSocket is already connecting or open.');
      return;
    }

    if (this.isConnecting) {
      console.log('Already in the process of connecting...');
      return;
    }

    this.isConnecting = true;
    this.shouldReconnect = true;

    if (isReconnect) {
      if (this.maxReconnectAttempts > 0 && this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.warn(`达到最大重连次数 (${this.maxReconnectAttempts})，停止自动重连。`);
        this.shouldReconnect = false;
        this.isConnecting = false;
        this.emit('error', new Error('Max reconnect attempts reached'));
        return;
      }

      this.reconnectAttempts++;

      let delay: number;
      if (this.getReconnectDelayFn) {
        delay = this.getReconnectDelayFn(this.reconnectAttempts);
      } else {
        delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      }

      console.log(`尝试第 ${this.reconnectAttempts} 次重连，延迟 ${delay}ms...`);
      setTimeout(() => this._connectInternal(), delay);
    } else {
      this._connectInternal();
    }
  }

  /** @private 内部连接逻辑 */
  private _connectInternal(): void {
    this.ws = new WebSocket(this.url);

    this.ws.onopen = (e) => this._onOpen(e);
    this.ws.onmessage = (e) => this._onMessage(e);
    this.ws.onclose = (e) => this._onClose(e);
    this.ws.onerror = (e) => this._onError(e);
  }

  /** @private 连接成功事件处理 */
  private _onOpen(event: Event): void {
    this.isConnecting = false;
    console.log(`WebSocket 连接成功.`);
    this.reconnectAttempts = 0;

    if (this.heartbeatEnabled) {
      this.startHeartbeat();
    }
    this.emit('open', event);

    this._flushSendQueue();
  }

  /** @private 消息接收事件处理 */
  private _onMessage(event: MessageEvent): void {
    const rawData = event.data;
    let data: unknown = rawData;

    if (typeof rawData === 'string') {
      try {
        data = JSON.parse(rawData);
      } catch {
        data = rawData;
      }
    }

    // --- 内部 Ping/Pong 机制处理 ---
    let isPong: boolean = false;
    if (this.isPongFn) {
      isPong = this.isPongFn(data);
    } else if (data === 'pong') {
      isPong = true;
    } else if (typeof data === 'object' && data !== null && 'type' in data) {
      const payload = data as { type?: string };
      isPong = payload.type === 'pong';
    } else {
      isPong = false;
    }

    if (isPong) {
      this.clearPongTimeout();
      this.emit('pong', data);
      return;
    }
    // --------------------------------

    this.emit('message', event);
  }

  /** @private 连接关闭事件处理 */
  private _onClose(event: CloseEvent): void {
    this.isConnecting = false;
    console.log('WebSocket 连接已关闭.', event.code, event.reason);
    this.stopHeartbeat();
    this.emit('close', event);

    if (this.shouldReconnect) {
      this.connect(true);
    }
  }

  /** @private 连接错误事件处理 */
  private _onError(event: Event): void {
    console.error('WebSocket 发生错误:', event);
    this.emit('error', event);
  }

  // --- Ping/Pong 心跳机制 ---

  /** @private 启动心跳机制 */
  private startHeartbeat(): void {
    if (!this.heartbeatEnabled) {
      return;
    }
    this.stopHeartbeat();
    // window.setInterval 返回 number 类型
    this.heartbeatTimer = window.setInterval(() => {
      this.ping();
    }, this.heartbeatInterval);
    console.log('心跳机制已启动.');
  }

  /** @private 停止心跳机制 */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer !== null) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    this.clearPongTimeout();
  }

  /** @private 清除等待 pong 的超时定时器 */
  private clearPongTimeout(): void {
    if (this.pongTimeoutTimer !== null) {
      clearTimeout(this.pongTimeoutTimer);
      this.pongTimeoutTimer = null;
    }
  }

  /** 发送 ping 消息并设置 pong 超时 */
  public ping(): void {
    if (this.isConnected && this.ws) {
      let messageToSend: string;

      if (typeof this.customPingMessage === 'object') {
        messageToSend = JSON.stringify({ ...this.customPingMessage, timestamp: Date.now() });
      } else {
        messageToSend = this.customPingMessage as string;
      }

      this.ws.send(messageToSend);
      this.emit('ping', messageToSend);

      this.clearPongTimeout();
      // window.setTimeout 返回 number 类型
      this.pongTimeoutTimer = window.setTimeout(() => {
        console.warn('Ping 超时，未收到 Pong 响应，强制关闭连接以触发重连。');
        this.ws?.close(1000, 'Heartbeat timeout');
      }, this.pongTimeout);
    }
  }

  // --- 消息缓冲与发送 ---

  /** @private 发送缓冲队列中的所有消息 */
  private _flushSendQueue(): void {
    if (this.sendQueue.length > 0 && this.isConnected && this.ws) {
      console.log(` flushing ${this.sendQueue.length} buffered messages.`);
      while (this.sendQueue.length > 0) {
        const data = this.sendQueue.shift();
        if (data) {
          this._sendInternal(data);
        }
      }
    }
  }

  /** @private 内部发送数据逻辑 */
  private _sendInternal(data: string | object): void {
    if (this.ws) {
      const message = typeof data === 'object' ? JSON.stringify(data) : data;
      this.ws.send(message);
    }
  }


  /**
   * 发送数据 (支持缓冲)
   * @param data - 要发送的数据
   * @returns 消息是否被成功发送或加入队列
   */
  public send(data: string | object): boolean {
    if (this.isConnected) {
      this._sendInternal(data);
      return true;
    } else {
      this.sendQueue.push(data);
      console.warn('WebSocket 未连接，消息已加入缓冲队列。', data);
      return true;
    }
  }

  /** 手动关闭连接 */
  public close(code: number = 1000, reason: string = ''): void {
    this.shouldReconnect = false;
    this.isConnecting = false;
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close(code, reason);
    }
  }

  // --- 事件绑定 ---

  /** 绑定事件监听器 (多次触发) */
  public on<E extends AnyEventName>(eventName: E, callback: ListenerCallback<E>): void {
    if (typeof callback !== 'function') return;
    const listeners = this.listeners.get(eventName) || [];
    listeners.push({ callback: callback as ListenerCallback, type: 'on' });
    this.listeners.set(eventName, listeners);
  }

  /** 绑定事件监听器 (只触发一次) */
  public once<E extends AnyEventName>(eventName: E, callback: ListenerCallback<E>): void {
    if (typeof callback !== 'function') return;
    const listeners = this.listeners.get(`once:${eventName}`) || [];
    listeners.push({ callback: callback as ListenerCallback, type: 'once' });
    this.listeners.set(`once:${eventName}`, listeners);
  }

  /** 移除事件监听器 (如果未指定 callback，则移除所有) */
  public off<E extends AnyEventName>(eventName: E, callback?: ListenerCallback<E>): void {
    // 移除普通监听器
    const currentListeners = this.listeners.get(eventName) || [];
    if (callback) {
      this.listeners.set(eventName, currentListeners.filter(l => l.callback !== callback));
    } else {
      this.listeners.set(eventName, []);
    }

    // 移除 once 监听器
    const onceListeners = this.listeners.get(`once:${eventName}`) || [];
    if (callback) {
      this.listeners.set(`once:${eventName}`, onceListeners.filter(l => l.callback !== callback));
    } else {
      this.listeners.set(`once:${eventName}`, []);
    }
  }
}
