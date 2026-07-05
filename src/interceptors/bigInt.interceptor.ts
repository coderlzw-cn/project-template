// big-int.interceptor.ts
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import JSONbig from 'json-bigint';
import { map } from 'rxjs/operators';

@Injectable()
export class BigIntInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    return next.handle().pipe(
      map((data) => {
        // 使用 json-bigint 序列化再转回对象，或者直接手动递归转换
        // 这里的目的是为了防止 Nest 自带的序列化报错
        const res = JSONbig.stringify(data);
        return JSON.parse(res);
      }),
    );
  }
}
