import { HttpAdapterHost, NestApplication, NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { INestApplication, Logger, ValidationPipe } from '@nestjs/common';
import appConfig from './config/app.config';
import { HttpExceptionFilter } from '@app/common/filters/http-exception.filter';
import { CatchEverythingFilter } from '@app/common/filters/all-exception.filter';
import { RequestLoggerMiddleware } from '@app/common/middleware/request-logger.middleware';
import { join } from 'node:path';
import { TransformInterceptor } from '@app/common/interceptors/transform';
import { WsAdapter } from '@nestjs/platform-ws';
import { USER } from '@workspace/common/constants/enum.constant';
import { getStr } from '@workspace/common/utils/string';
console.log(USER.ADMIN);

console.log(getStr(12));

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
    cors: true,
  });
  const httpAdapterHost = app.get(HttpAdapterHost);
  const appConfiguration = appConfig();

  app.enableShutdownHooks(); // 启用关闭钩子,用于优雅关闭应用
  app.enableCors(); // 启用跨域

  // 全局路由前缀
  app.setGlobalPrefix(appConfiguration.prefixApi);

  // 注册全局响应转换拦截器
  app.useGlobalInterceptors(new TransformInterceptor());

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

  // 使用 WebSocket 适配器
  app.useWebSocketAdapter(new WsAdapter(app));

  // 启动 Swagger
  swaggerBootstrap(app, appConfiguration.env === 'development');
  await app.listen(appConfiguration.port, appConfiguration.host);

  Logger.log(`Environment: ${appConfiguration.env}`, 'Bootstrap');
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

import fs from 'node:fs';
import path from 'node:path';
import { type PipeOptions } from 'node:stream';

export interface ReadStreamEvents {
  onOpen?: (fd: number) => void; // 文件描述符打开
  onReady?: () => void; // 流准备就绪
  onData?: (chunk: Buffer | string) => void; // 读取到数据
  onReadable?: () => void; // 有数据可读
  onPause?: () => void; // 流暂停
  onResume?: () => void; // 流恢复
  onError?: (err: Error) => void; // 发生错误
  onEnd?: () => void; // 数据读取完毕（未关闭）
  onClose?: () => void; // 流彻底关闭
}

const readStream = fs.createReadStream('/Users/liangzhiwei/开发/project-template/package.json');
readStream.on('open', (a,b)=>{
  console.log(a,b);
});
readStream.on('ready', (a, b) => {
  console.log(a, b);
});
readStream.on('data', (a, b) => {
  console.log(a, b);
});
// readStream.on('readable', (a, b) => {
//   console.log(a, b);
// });
// readStream.on('pause', (a, b) => {
//   console.log(a, b);
// });
// readStream.on('resume', (a, b) => {
//   console.log(a, b);
// });
readStream.on('error', (a, b) => {
  console.log(a, b);
});
readStream.on('end', (a, b) => {
  console.log(a, b);
});

readStream.on('close', (a, b) => {
  console.log(a, b);
});

//
// readStream.on('end', (p) => {
//   console.log(p);
//   // 注意：这里不直接 resolve，通常等待 close 事件确保资源释放
//   if (events.onEnd) events.onEnd();
// });
//
// readStream.on('close', () => {
//   if (events.onClose) events.onClose();
//   resolve();
// });
