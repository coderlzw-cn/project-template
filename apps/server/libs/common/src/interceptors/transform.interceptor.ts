import { CallHandler, ExecutionContext, HttpStatus, Injectable, NestInterceptor, StreamableFile } from '@nestjs/common';
import { HTTP_CODE_METADATA, REDIRECT_METADATA, SSE_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { map, Observable } from 'rxjs';
import { SKIP_TRANSFORM_KEY } from '../decorators/skip-transform.decorator';

const DEFAULT_SUCCESS_MESSAGE = '请求成功';
const DEFAULT_OPERATION_MESSAGE = '操作成功';

/** 统一成功响应外壳（与异常过滤器中的结构可独立演进，调用方以前端约定为准） */
export interface ApiResponse<T> {
  data: T | null;
  code: number;
  message: string;
}

@Injectable()
export class TransformInterceptor implements NestInterceptor<unknown, unknown> {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    // 全局拦截器可能作用到 WS/RPC 等上下文，这里只处理 HTTP 响应。
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const handler = context.getHandler();
    const controller = context.getClass();

    // 显式声明不包装（文件下载约定、特殊 JSON 等）
    if (this.reflector.getAllAndOverride<boolean>(SKIP_TRANSFORM_KEY, [handler, controller])) {
      return next.handle();
    }

    // SSE：响应为长连接事件流，不能包一层 JSON
    if (this.reflector.get<boolean>(SSE_METADATA, handler)) {
      return next.handle();
    }

    // 重定向：框架会写 Location/status，包装会破坏语义
    if (this.reflector.get<{ statusCode?: number; url?: string } | undefined>(REDIRECT_METADATA, handler)) {
      return next.handle();
    }

    const httpCode = this.reflector.getAllAndOverride<number>(HTTP_CODE_METADATA, [handler, controller]) ?? HttpStatus.OK;

    return next.handle().pipe(map((data: unknown) => this.toEnvelope(data, httpCode)));
  }

  /**
   * 将控制器返回值转为统一外壳。
   * - `StreamableFile` / `Buffer`：文件类响应，原样返回，避免破坏流式 body。
   * - HTTP 204：按协议不返回 body。
   * - 已经是 `{ code, message, data }` 的响应：原样返回，避免二次包装。
   * - 仅 `{ message: string }`：视为「只有提示、无业务载荷」，data 置为 null（若业务实体只有一个 message 字段，请用 @SkipTransform()）。
   */
  private toEnvelope(data: unknown, httpCode: number): ApiResponse<unknown> | unknown {
    if (httpCode === HttpStatus.NO_CONTENT) {
      return undefined;
    }

    // 2. 处理文件和原始 Buffer (保持原逻辑)
    if (data instanceof StreamableFile || Buffer.isBuffer(data)) {
      return data;
    }

    // --- 处理 Msg 实例 ---
    if (data instanceof Msg) {
      return data.toResponse(httpCode);
    }
    // --------------------------------

    // 3. 处理普通对象或数组
    const record = typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : {};
    if (this.isApiResponse(data)) {
      return data;
    }

    const rawMessage = record.message;
    const message = typeof rawMessage === 'string' && rawMessage.trim().length > 0 ? rawMessage : DEFAULT_SUCCESS_MESSAGE;

    // 兼容逻辑：如果返回的是 { message: '...' } 且没有其他 Key，视为 data 为 null
    const isOnlyMessage = Object.keys(record).length === 1 && Object.prototype.hasOwnProperty.call(record, 'message');

    const normalizedData = isOnlyMessage ? null : (data ?? null);

    return {
      code: httpCode,
      message,
      data: normalizedData,
    };
  }

  private isApiResponse(data: unknown): data is ApiResponse<unknown> {
    if (typeof data !== 'object' || data === null) {
      return false;
    }

    const record = data as Record<string, unknown>;

    return typeof record.code === 'number' && typeof record.message === 'string' && Object.prototype.hasOwnProperty.call(data, 'data');
  }
}

/**
 * 业务响应包装器
 * 专门用于处理「非实体业务数据」的返回场景
 */
export interface MsgOptions<T = unknown> {
  /** @example '保存成功' */
  message?: string;
  /** @example { id: 1 } */
  data?: T | null;
  /** @example HttpStatus.CREATED */
  code?: number;
}

type MsgInput<T> = string | MsgOptions<T>;

export class Msg<T = unknown> {
  public readonly message: string;
  public readonly data: T | null;
  public readonly code?: number;

  /**
   * 创建业务响应消息。
   *
   * @example
   * return new Msg('保存成功');
   *
   * @example
   * return new Msg('保存成功', { id: 1 });
   *
   * @example
   * return new Msg({ message: '创建成功', data: { id: 1 }, code: HttpStatus.CREATED });
   */
  constructor(message?: string, data?: T | null, code?: number);
  constructor(options?: MsgOptions<T>);
  constructor(input: MsgInput<T> = DEFAULT_OPERATION_MESSAGE, data?: T | null, code?: number) {
    if (typeof input === 'string') {
      this.message = input;
      this.data = data ?? null;
      this.code = code;
      return;
    }

    this.message = input.message ?? DEFAULT_OPERATION_MESSAGE;
    this.data = input.data ?? null;
    this.code = input.code;
  }

  /**
   * 标准成功消息。
   * 支持：
   * - Msg.success('保存成功')
   * - Msg.success({ message: '保存成功', data: { id: 1 }, code: 201 })
   *
   * @example
   * return Msg.success();
   *
   * @example
   * return Msg.success('保存成功');
   *
   * @example
   * return Msg.success('保存成功', { id: 1 });
   *
   * @example
   * return Msg.success({ message: '保存成功', data: { id: 1 }, code: HttpStatus.CREATED });
   */
  static success<T = unknown>(message?: string, data?: T | null): Msg<T>;
  static success<T = unknown>(options?: MsgOptions<T>): Msg<T>;
  static success<T = unknown>(input: MsgInput<T> = DEFAULT_OPERATION_MESSAGE, data?: T | null): Msg<T> {
    return typeof input === 'string' ? new Msg<T>(input, data) : new Msg<T>(input);
  }

  /**
   * 快捷静态方法：OK。
   *
   * @example
   * return Msg.ok();
   *
   * @example
   * return Msg.ok('操作成功');
   *
   * @example
   * return Msg.ok({ message: '操作成功', data: { id: 1 } });
   */
  static ok<T = unknown>(message?: string, data?: T | null): Msg<T>;
  static ok<T = unknown>(options?: MsgOptions<T>): Msg<T>;
  static ok<T = unknown>(input: MsgInput<T> = DEFAULT_OPERATION_MESSAGE, data?: T | null): Msg<T> {
    return typeof input === 'string' ? this.success(input, data) : this.success(input);
  }

  /**
   * 直接返回数据，同时保留可读 message。
   *
   * @example
   * return Msg.data({ id: 1 });
   *
   * @example
   * return Msg.data({ id: 1 }, '查询成功');
   */
  static data<T>(data: T | null, message = DEFAULT_SUCCESS_MESSAGE): Msg<T> {
    return new Msg<T>(message, data);
  }

  /**
   * `data` 的语义化别名。
   *
   * @example
   * return Msg.of(user);
   *
   * @example
   * return Msg.of(user, '查询成功');
   */
  static of<T>(data: T | null, message = DEFAULT_SUCCESS_MESSAGE): Msg<T> {
    return this.data(data, message);
  }

  /**
   * 创建成功，默认使用 201 业务 code。
   *
   * @example
   * return Msg.created();
   *
   * @example
   * return Msg.created('创建成功', { id: 1 });
   */
  static created<T = unknown>(message = '创建成功', data?: T | null): Msg<T> {
    return new Msg<T>(message, data, HttpStatus.CREATED);
  }

  /**
   * 删除成功。
   *
   * @example
   * return Msg.deleted();
   *
   * @example
   * return Msg.deleted('删除成功', { id: 1 });
   */
  static deleted<T = unknown>(message = '删除成功', data?: T | null): Msg<T> {
    return new Msg<T>(message, data);
  }

  /**
   * 更新成功。
   *
   * @example
   * return Msg.updated();
   *
   * @example
   * return Msg.updated('更新成功', { id: 1 });
   */
  static updated<T = unknown>(message = '更新成功', data?: T | null): Msg<T> {
    return new Msg<T>(message, data);
  }

  /**
   * 链式增强：附加数据。
   *
   * @example
   * return Msg.success('保存成功').with({ id: 123 });
   *
   * @example
   * return Msg.success('保存成功').with(false);
   */
  with<U>(data: U | null): Msg<U> {
    return new Msg<U>({ message: this.message, data, code: this.code });
  }

  /**
   * `with` 的语义化别名。
   *
   * @example
   * return Msg.success('保存成功').withData({ id: 123 });
   *
   * @example
   * return Msg.success('校验完成').withData({ passed: true });
   */
  withData<U>(data: U | null): Msg<U> {
    return this.with(data);
  }

  /**
   * 链式修改 message。
   *
   * @example
   * return Msg.data(user).withMessage('查询成功');
   *
   * @example
   * return Msg.success().withMessage('密码已重置');
   */
  withMessage(message: string): Msg<T> {
    return new Msg<T>({ message, data: this.data, code: this.code });
  }

  /**
   * 链式覆盖响应 code；不传则仍使用 @HttpCode 或默认 200。
   *
   * @example
   * return Msg.success('创建成功').withCode(HttpStatus.CREATED);
   *
   * @example
   * return Msg.data({ id: 1 }).withCode(201);
   */
  withCode(code: number): Msg<T> {
    return new Msg<T>({ message: this.message, data: this.data, code });
  }

  /**
   * 由拦截器调用，合并路由默认 httpCode 和 Msg 自定义 code。
   *
   * @example
   * Msg.success('保存成功').toResponse(HttpStatus.OK);
   *
   * @example
   * Msg.created('创建成功').toResponse(HttpStatus.OK);
   */
  toResponse(defaultCode: number): ApiResponse<T | null> {
    return {
      code: this.code ?? defaultCode,
      message: this.message,
      data: this.data,
    };
  }
}
