import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { FILE_RESPONSE_METADATA_KEY, FileResponseOptions } from '../decorators/file-response.decorator';

/**
 * 文件响应头拦截器。
 * 作用：
 * - 对标记 `@FileResponse()` 的接口统一设置 Content-Type 和 Content-Disposition。
 * - 保持响应 body 原样，不干预 Buffer、StreamableFile 或业务自行返回的文件内容。
 * - 适合报表导出、模板下载、图片预览等接口。
 *
 * @example
 * @FileResponse({ filename: 'report.xlsx' })
 * exportReport() {
 *   return new StreamableFile(stream);
 * }
 */
@Injectable()
export class FileResponseInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const options = this.reflector.getAllAndOverride<FileResponseOptions>(FILE_RESPONSE_METADATA_KEY, [context.getHandler(), context.getClass()]);
    if (!options) {
      return next.handle();
    }

    const response = context.switchToHttp().getResponse<{ setHeader: (name: string, value: string) => void }>();

    return next.handle().pipe(
      tap(() => {
        if (options.contentType) {
          response.setHeader('Content-Type', options.contentType);
        }

        if (options.filename) {
          const disposition = options.disposition ?? 'attachment';
          response.setHeader('Content-Disposition', `${disposition}; filename="${encodeURIComponent(options.filename)}"`);
        }
      }),
    );
  }
}
