import { INestApplication, Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { HttpAdapterHost, NestApplication, NestFactory, Reflector } from '@nestjs/core';
import { WsAdapter } from '@nestjs/platform-ws';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import { json, urlencoded, type Application } from 'express';
import helmet from 'helmet';
import { join } from 'node:path';
import { AppModule } from './app.module';
import { CatchEverythingFilter } from './filters/all-exception.filter';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { BigIntInterceptor } from './interceptors/bigInt.interceptor';
import { TimeoutInterceptor } from './interceptors/timeout.interceptor';
import { TransformInterceptor } from './interceptors/transform.interceptor';
import { RequestLoggerMiddleware } from './middleware/request-logger.middleware';
import { getEnvStr, isDevelopment, isProduction } from './utils/env';
import { appConfig } from './config/app.config';
import { RequestContextMiddleware } from './middleware/request-context.middleware';
import { MaintenanceModeMiddleware } from './middleware/maintenance-mode.middleware';
import { IpAccessControlMiddleware } from './middleware/ip-access-control.middleware';

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

async function bootstrap() {
  const app = await NestFactory.create<NestApplication>(AppModule, {
    // 生产环境只打印 log, error, warn；开发环境打印所有
    logger: isProduction ? ['log', 'error', 'warn'] : ['debug', 'log', 'verbose', 'warn', 'error'],
    cors: true,
    // 如果你的 AppModule 初始化非常慢（比如连接数据库很久），这期间产生的日志可能会丢失或乱序。开启 bufferLogs 可以让 Nest 收集所有启动日志，直到 Logger 准备就绪后再一次性打印。
    // bufferLogs: true,
  });
  const httpAdapterHost = app.get(HttpAdapterHost);
  const appConfiguration = appConfig();
  // 获取底层 HTTP 适配器 (Express)
  const httpAdapter = app.getHttpAdapter().getInstance();

  app.use(
    helmet({
      contentSecurityPolicy: isProduction ? undefined : false, // 开发环境禁用 CSP 以便 Swagger 正常显示
    }),
  );

  // 限制请求体大小
  app.use(json({ limit: '10mb' }));
  // 限制 URL 编码的请求体大小
  app.use(urlencoded({ extended: true, limit: '10mb' }));

  // 启用版本控制
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // 获取真实 IP (Trust Proxy)
  // 如果你的应用部署在 Nginx、Cloudflare 或 Docker 负载均衡之后，request.ip 拿到的可能是网关的内网 IP。为了让 Throttler（限流）准确工作，必须开启 trust proxy。
  const expressApp = app.getHttpAdapter().getInstance<Application>();
  expressApp.set('trust proxy', 1); // 1 表示信任第一层代理

  // 全局路由前缀
  app.setGlobalPrefix(appConfiguration.prefixApi);

  // 注册全局响应转换拦截器（需 Reflector 以识别 @HttpCode、@SkipTransform 等元数据）
  app.useGlobalInterceptors(new TimeoutInterceptor());
  app.useGlobalInterceptors(new BigIntInterceptor());
  app.useGlobalInterceptors(new TransformInterceptor(app.get(Reflector)));

  // 开放静态资源
  app.useStaticAssets(join(process.cwd(), 'resources/images'), {
    prefix: '/images/', //设置虚拟路径
  });

  // 全局管道
  app.useGlobalPipes(
    new ValidationPipe({
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

  // 中间件
  app.use(RequestLoggerMiddleware);
  app.use(RequestContextMiddleware);

  // app.use(MaintenanceModeMiddleware({ enabled: true }));
  // app.use(IpAccessControlMiddleware({ allowList: ['192.333.393.23'] }));

  // 使用 WebSocket 适配器
  app.useWebSocketAdapter(new WsAdapter(app));

  // 启动 Swagger
  swaggerBootstrap(app, isDevelopment);

  app.enableShutdownHooks(); // 启用关闭钩子,用于优雅关闭应用
  app.use(compression()); // 启用压缩
  await app.listen(appConfiguration.port, appConfiguration.host);

  Logger.log(`Environment: ${getEnvStr('NODE_ENV')}`, 'Bootstrap');
  Logger.log(`Application is running on: ${await app.getUrl()}${appConfiguration.prefixApi}`, 'Bootstrap');
  Logger.log(`Swagger is running on: ${await app.getUrl()}/swagger`, 'Bootstrap');
}
void bootstrap();

// 捕获未被 .catch 处理的 Promise 拒绝
process.on('unhandledRejection', (reason: Error) => {
  console.error('未处理的拒绝：', reason.message);
});

// 捕获同步代码中未被 try...catch 捕获的异常和异步代码中未被处理的同步错误
process.on('uncaughtException', (error: Error) => {
  console.error('未捕获的异常：', error.message);
});

process.on('SIGTERM', () => {
  Logger.log('SIGTERM signal received: closing HTTP server', 'Bootstrap');
});
