import '@/license/utils/machine';
import { ConsoleLogger, INestApplication, Logger, LogLevel, RequestMethod, ShutdownSignal, VersioningType } from '@nestjs/common';
import { HttpAdapterHost, NestApplication, NestFactory, Reflector } from '@nestjs/core';
import { WsAdapter } from '@nestjs/platform-ws';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import { json, urlencoded, type Application } from 'express';
import helmet from 'helmet';
import { I18nValidationPipe } from 'nestjs-i18n';
import { join } from 'node:path';
import { AppModule } from './app.module';
import { appConfig } from './config/app.config';
import { CatchEverythingFilter } from './filters/all-exception.filter';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { TimeoutInterceptor } from './interceptors/timeout.interceptor';
import { LocaleResponseMiddleware } from './middleware/locale-response.middleware';
import { MaintenanceModeMiddleware } from './middleware/maintenance-mode.middleware';
import { RequestContextMiddleware } from './middleware/request-context.middleware';

import '@/utils/json';
import { ExcludeSensitiveInterceptor } from './interceptors/exclude-sensitive.interceptor';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { SerializeInterceptor } from './interceptors/serialize.interceptor';
import { TransformInterceptor } from './interceptors/transform.interceptor';
import { IpAccessControlMiddleware } from './middleware/ip-access-control.middleware';
import { RequestLoggerMiddleware } from './middleware/request-logger.middleware';
import { getEnvStr, isDevelopment, isProduction } from './utils/env';
import { getErrorMessage } from './utils/error';
const swaggerBootstrap = (app: INestApplication, dev: boolean = false) => {
  if (!dev) return;
  const swaggerOptions = new DocumentBuilder()
    .setTitle('API Documentation')
    .setDescription(
      `
    当前环境: ${process.env.NODE_ENV}
    最后更新: ${new Date().toLocaleString()}
    [项目设计文档](https://wiki.example.com)
  `,
    )
    .setVersion('1.0')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      name: 'JWT',
      description: '请输入 Token',
      in: 'header',
    })
    .build();

  const document = SwaggerModule.createDocument(app, swaggerOptions);
  SwaggerModule.setup('swagger', app, document, {
    raw: dev,
    ui: dev,
    customCss: '.swagger-ui .topbar { display: none }', // 隐藏顶部深色条
    customSiteTitle: 'My Project API', // 浏览器标签页标题
    swaggerOptions: {
      persistAuthorization: true, // 持久化授权
      displayRequestDuration: true, // 显示请求耗时
      displayResponseHeaders: true, // 显示响应头
      filter: true, // 支持搜索过滤接口
      operationsSorter: 'alpha', // 按字母顺序排序接口
      tagsSorter: 'alpha', // 按字母顺序排序分类标签
    },
  });
};

const logLevels: LogLevel[] = isProduction ? ['log', 'warn', 'error', 'fatal'] : ['verbose', 'debug', 'log', 'warn', 'error', 'fatal'];

const FATAL_SHUTDOWN_TIMEOUT_MS = 10_000;
let application: NestApplication | undefined;
let fatalShutdownStarted = false;

/**
 * 未捕获异常意味着进程可能已处于不一致状态：停止接收新请求、释放已初始化的资源，
 * 并保留非零退出码交由 Docker、PM2 或 systemd 按既定策略拉起新实例。
 *
 * 超时定时器使用 unref，正常清理完成且没有遗留句柄时不会阻止进程自然退出；若仍有
 * Socket、定时任务等句柄未释放，则在截止时间强制退出，避免实例永久卡在 terminating。
 */
async function shutdownAfterFatalError(source: 'uncaughtException' | 'unhandledRejection' | 'bootstrap', error: unknown): Promise<void> {
  if (fatalShutdownStarted) {
    Logger.error(`进程关闭期间再次发生致命错误：${getErrorMessage(error)}`, source);
    return;
  }

  fatalShutdownStarted = true;
  process.exitCode = 1;

  const message = getErrorMessage(error);
  const stack = error instanceof Error ? error.stack : undefined;
  Logger.fatal(stack ?? message, source);

  const forceExitTimer = setTimeout(() => {
    Logger.error(`致命错误清理超过 ${FATAL_SHUTDOWN_TIMEOUT_MS}ms，强制退出进程`, 'ProcessShutdown');
    process.exit(1);
  }, FATAL_SHUTDOWN_TIMEOUT_MS);
  forceExitTimer.unref();

  try {
    // NestApplication.close() 会依次触发 onModuleDestroy、
    // beforeApplicationShutdown 和 onApplicationShutdown，并关闭 HTTP 服务。
    await application?.close();
  } catch (shutdownError) {
    Logger.error(`致命错误后的资源清理失败：${getErrorMessage(shutdownError)}`, 'ProcessShutdown');
  }
}

async function bootstrap() {
  const app = await NestFactory.create<NestApplication>(AppModule, {
    logger: new ConsoleLogger({ json: isProduction, colors: !isProduction, logLevels }),
    cors: true,
    // 如果你的 AppModule 初始化非常慢（比如连接数据库很久），这期间产生的日志可能会丢失或乱序。开启 bufferLogs 可以让 Nest 收集所有启动日志，直到 Logger 准备就绪后再一次性打印。
    bufferLogs: false,
  });

  application = app;
  const httpAdapterHost = app.get(HttpAdapterHost);
  const appConfiguration = appConfig();
  const expressApp = app.getHttpAdapter().getInstance<Application>();
  const reflector = app.get(Reflector);

  app.use(helmet({ contentSecurityPolicy: isProduction ? undefined : false })); // 开发环境禁用 CSP 以便 Swagger 正常显示
  app.use(LocaleResponseMiddleware);
  app.use(RequestContextMiddleware);
  app.use(RequestLoggerMiddleware);
  app.use(json({ limit: '10mb' })); // 限制请求体大小
  app.use(urlencoded({ extended: true, limit: '10mb' })); // 限制 URL 编码的请求体大小
  app.use(compression()); // 启用压缩
  app.use(MaintenanceModeMiddleware({ enabled: false }));
  app.use(IpAccessControlMiddleware({ allowList: ['127.0.0.1'], excludePaths: ['/health'] }));

  // 启用版本控制
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  // 获取真实 IP (Trust Proxy)
  // 如果你的应用部署在 Nginx、Cloudflare 或 Docker 负载均衡之后，request.ip 拿到的可能是网关的内网 IP。为了让 Throttler（限流）准确工作，必须开启 trust proxy。
  expressApp.set('trust proxy', 1); // 1 表示信任第一层代理

  // 全局路由前缀
  app.setGlobalPrefix(appConfiguration.apiPrefix, {
    exclude: [
      { path: 'health', method: RequestMethod.ALL },
      { path: 'health/{*path}', method: RequestMethod.ALL },
    ],
  });

  // 注册全局响应转换拦截器
  app.useGlobalInterceptors(new TimeoutInterceptor(reflector));
  app.useGlobalInterceptors(new ExcludeSensitiveInterceptor(reflector));
  app.useGlobalInterceptors(new TransformInterceptor(reflector));
  app.useGlobalInterceptors(new SerializeInterceptor(reflector));
  app.useGlobalInterceptors(new LoggingInterceptor());

  // 开放静态资源
  app.useStaticAssets(join(process.cwd(), 'resources/images'), { prefix: '/images/' });

  // 全局管道
  app.useGlobalPipes(
    new I18nValidationPipe({
      whitelist: true, // 自动剔除输入对象中没有任何装饰器的属性
      transform: true, // 必须开启，才会触发 class-transformer
      stopAtFirstError: true, // 遇到第一个错误时停止验证，而不是继续验证所有错误
      validationError: {
        target: isDevelopment, // 不暴露验证目标对象
        value: isDevelopment, // 不暴露验证值
      },
      transformOptions: {
        enableImplicitConversion: true, // 基于 TS 类型自动将字符串转为数字、布尔值等。
      },
    }),
  );

  // 过滤器
  app.useGlobalFilters(new CatchEverythingFilter(httpAdapterHost));
  app.useGlobalFilters(new HttpExceptionFilter());

  // 使用 WebSocket 适配器
  app.useWebSocketAdapter(new WsAdapter(app));

  // 启动 Swagger
  swaggerBootstrap(app, isDevelopment);

  // 正常退出统一交给 Nest 管理。不要再为这些信号注册 process.on 监听器，否则 Nest
  // 清理完成后重新发送原信号时可能被重复拦截，导致容器或进程管理器无法结束进程。
  app.enableShutdownHooks([
    ShutdownSignal.SIGTERM, // Docker、Kubernetes、systemd 的标准终止信号
    ShutdownSignal.SIGINT, // Ctrl+C 和 PM2 默认停止信号
    ShutdownSignal.SIGQUIT, // Unix 约定的优雅退出信号
    ShutdownSignal.SIGHUP, // 终端断开或部分进程管理器的重载/退出信号
  ]);

  await app.listen(appConfiguration.port, appConfiguration.host);

  Logger.log(`Environment: ${getEnvStr('NODE_ENV')}`, 'Bootstrap');
  Logger.log(`Application is running on: ${await app.getUrl()}${appConfiguration.apiPrefix}`, 'Bootstrap');
  Logger.log(`Swagger is running on: ${await app.getUrl()}/swagger`, 'Bootstrap');

  if (module.hot) {
    module.hot?.accept();
    module.hot?.dispose(() => app.close());
  }
}

void bootstrap().catch((error: unknown) => shutdownAfterFatalError('bootstrap', error));

process.on('uncaughtException', (error: Error) => {
  void shutdownAfterFatalError('uncaughtException', error);
});

process.on('unhandledRejection', (reason: unknown) => {
  void shutdownAfterFatalError('unhandledRejection', reason);
});
