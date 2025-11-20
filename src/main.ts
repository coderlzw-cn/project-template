import { HttpAdapterHost, NestApplication, NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { INestApplication, Logger, ValidationPipe } from '@nestjs/common';
import appConfig from './config/app.config';
import { HttpExceptionFilter } from '@app/common/filters/http-exception.filter';
import { CatchEverythingFilter } from '@app/common/filters/all-exception.filter';
import { RequestLoggerMiddleware } from '@app/common/middleware/request-logger.middleware';
import { join } from 'node:path';
/**
 * 启动 Swagger
 * @param app INestApplication
 * @param dev
 * @returns void
 */
const swaggerBootstrap = (app: INestApplication, dev: boolean = false) => {
  const swaggerOptions = new DocumentBuilder()
    .setTitle('API Documentation')
    .setDescription('API documentation for the project')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerOptions);
  SwaggerModule.setup('swagger', app, document, {
    raw: dev,
    ui: dev,
    explorer: true,
    swaggerOptions: {
      persistAuthorization: true, // 持久化授权
      displayRequestDuration: true, // 显示请求耗时
      displayResponseHeaders: true, // 显示响应头
      tryItOutEnabled: true, // 启用Try It Out
      requestSnippetsEnabled: true, // 启用请求片段
    },
  });
};

async function bootstrap() {
  const app = await NestFactory.create<NestApplication>(AppModule, {
    logger: ['debug', 'log'],
  });
  const httpAdapterHost = app.get(HttpAdapterHost);
  const appConfiguration = appConfig();

  app.enableShutdownHooks(); // 启用关闭钩子,用于优雅关闭应用
  app.enableCors(); // 启用跨域

  // 全局路由前缀
  app.setGlobalPrefix(appConfiguration.prefixApi);

  // 开放静态资源
  app.useStaticAssets(join(process.cwd(), 'resources/images'), {
    prefix: '/images/', //设置虚拟路径
  });

  // 全局管道
  app.useGlobalPipes(
    new ValidationPipe({
      // whitelist: true, // 去除 DTO 中未声明的字段
      transform: true, // 自动转换 payload 为 DTO 类型
    }),
  );

  // 过滤器
  app.useGlobalFilters(new CatchEverythingFilter(httpAdapterHost));
  app.useGlobalFilters(new HttpExceptionFilter());

  // 中间件
  app.use(RequestLoggerMiddleware);

  // 启动 Swagger
  swaggerBootstrap(app, appConfiguration.env === 'development');
  await app.listen(appConfiguration.port, appConfiguration.host);

  Logger.log(`Environment: ${appConfiguration.env}`, 'Bootstrap');
  Logger.log(`Application is running on: ${await app.getUrl()}${appConfiguration.prefixApi}`, 'Bootstrap');
  Logger.log(`Swagger is running on: ${await app.getUrl()}/swagger`, 'Bootstrap');
}
void bootstrap();

process.on('unhandledRejection', (reason: Error) => {
  console.error('未处理的拒绝：', reason.message);
});

process.on('uncaughtException', (error: Error) => {
  console.error('未捕获的异常：', error.message);
});

// process.on('SIGINT', () => {
//   console.log('进程被 SIGINT 信号终止，正在关闭...');
//   process.exit(0);
// });

// process.on('SIGTERM', () => {
//   console.log('进程被 SIGTERM 信号终止，正在关闭...');
//   process.exit(0);
// });

// process.on('beforeExit', (code: number) => {
//   console.log(`进程即将退出，退出码：${code}`);
// });

// process.on('exit', (code: number) => {
//   console.log(`进程已退出，退出码：${code}`);
// });
