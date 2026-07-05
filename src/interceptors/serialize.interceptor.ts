import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { instanceToPlain, plainToInstance } from 'class-transformer';
import { map, Observable } from 'rxjs';
import { SERIALIZE_METADATA_KEY, SerializeOptions } from '../decorators/serialize.decorator';

/**
 * DTO 序列化拦截器。
 * 作用：
 * - 对标记 `@Serialize(UserVo)` 的接口使用 class-transformer 控制输出结构。
 * - 常用于隐藏 password、secret 等字段，或统一日期/枚举等展示形式。
 * - 支持数组和单对象；未标记的接口不处理。
 *
 * @example
 * @Serialize(UserVo)
 * findOne() {
 *   return this.userService.findOne();
 * }
 */
@Injectable()
export class SerializeInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const serializeOptions = this.reflector.getAllAndOverride<SerializeOptions>(SERIALIZE_METADATA_KEY, [context.getHandler(), context.getClass()]);
    if (!serializeOptions) {
      return next.handle();
    }

    return next.handle().pipe(map((data) => this.serialize(data, serializeOptions)));
  }

  private serialize(data: unknown, serializeOptions: SerializeOptions): unknown {
    if (data === null || data === undefined) {
      return data;
    }

    const transformOne = (item: unknown) => {
      const instance = plainToInstance(serializeOptions.type, item, serializeOptions.options);
      return instanceToPlain(instance, serializeOptions.options);
    };

    return Array.isArray(data) ? data.map(transformOne) : transformOne(data);
  }
}
