import { INestApplication, ValidationPipe } from '@nestjs/common';
import { HttpAdapterHost, Reflector } from '@nestjs/core';
import { WsAdapter } from '@nestjs/platform-ws';
import { Application, json, urlencoded } from 'express';
import compression from 'compression';
import helmet from 'helmet';
import { CatchEverythingFilter } from '@app/common/filters/all-exception.filter';
import { BigIntInterceptor } from '@app/common/interceptors/bigInt.interceptor';
import { ETagInterceptor } from '@app/common/interceptors/etag.interceptor';
import { ExcludeSensitiveInterceptor } from '@app/common/interceptors/exclude-sensitive.interceptor';
import { FileResponseInterceptor } from '@app/common/interceptors/file-response.interceptor';
import { HttpCacheInterceptor } from '@app/common/interceptors/http-cache.interceptor';
import { LoggingInterceptor } from '@app/common/interceptors/logging.interceptor';
import { NoCacheInterceptor } from '@app/common/interceptors/no-cache.interceptor';
import { NullToEmptyInterceptor } from '@app/common/interceptors/null-to-empty.interceptor';
import { PaginationInterceptor } from '@app/common/interceptors/pagination.interceptor';
import { SerializeInterceptor } from '@app/common/interceptors/serialize.interceptor';
import { TimeoutInterceptor } from '@app/common/interceptors/timeout.interceptor';
import { TraceIdInterceptor } from '@app/common/interceptors/trace-id.interceptor';
import { TransformInterceptor } from '@app/common/interceptors/transform.interceptor';
import { MaintenanceModeMiddleware } from '@app/common/middleware/maintenance-mode.middleware';
import { RawBodyMiddleware } from '@app/common/middleware/raw-body.middleware';
import { RequestContextMiddleware } from '@app/common/middleware/request-context.middleware';
import { isDevelopment, isProduction } from '@app/common/utils/runtime-env';
import { IpWhitelistMiddleware } from '@app/common/middleware/ip-whitelist.middleware';

interface HttpSetupOptions {
  apiPrefix: string;
}

export function setupHttpApp(app: INestApplication, httpAdapterHost: HttpAdapterHost, options: HttpSetupOptions) {
  const application = app.getHttpAdapter().getInstance() as Application;
  const reflector = app.get(Reflector);

  application.set('trust proxy', 1);

  app.use(RequestContextMiddleware);
  app.use(MaintenanceModeMiddleware({ enabled: process.env.MAINTENANCE_MODE === 'true' }));
  app.use(helmet({ contentSecurityPolicy: isProduction() ? undefined : false }));
  app.use(json({ limit: '10mb', verify: RawBodyMiddleware }));
  app.use(urlencoded({ extended: true, limit: '10mb', verify: RawBodyMiddleware }));
  app.use(compression());

  app.useWebSocketAdapter(new WsAdapter(app));
  app.setGlobalPrefix(options.apiPrefix);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      stopAtFirstError: true,
      validationError: {
        target: isDevelopment(),
        value: isDevelopment(),
      },
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  app.useGlobalFilters(new CatchEverythingFilter(httpAdapterHost));

  // Middleware
  app.use(IpWhitelistMiddleware({ allowList: ['127.0.0.3'], paths: ['/internal'] }));
  // app.use(MaintenanceModeMiddleware({ enabled: process.env.MAINTENANCE_MODE === 'true' }));
  // app.use(MaintenanceModeMiddleware({ enabled: true}));

  // Request phase: top to bottom. Response phase: bottom to top.
  app.useGlobalInterceptors(new TraceIdInterceptor());
  app.useGlobalInterceptors(new LoggingInterceptor());
  app.useGlobalInterceptors(new NoCacheInterceptor(reflector));
  app.useGlobalInterceptors(new HttpCacheInterceptor(reflector));
  app.useGlobalInterceptors(new TimeoutInterceptor(reflector));
  app.useGlobalInterceptors(new FileResponseInterceptor(reflector));
  app.useGlobalInterceptors(new ETagInterceptor(reflector));
  app.useGlobalInterceptors(new BigIntInterceptor(reflector));
  app.useGlobalInterceptors(new TransformInterceptor(reflector));
  app.useGlobalInterceptors(new NullToEmptyInterceptor(reflector));
  app.useGlobalInterceptors(new ExcludeSensitiveInterceptor(reflector));
  app.useGlobalInterceptors(new SerializeInterceptor(reflector));
  app.useGlobalInterceptors(new PaginationInterceptor(reflector));
}
