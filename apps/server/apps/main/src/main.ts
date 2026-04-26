import { Logger } from '@nestjs/common';
import { HttpAdapterHost, NestApplication, NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setupHttpApp } from './bootstrap/http';
import { registerProcessHooks } from './bootstrap/process-hooks';
import { setupSwagger } from './bootstrap/swagger';
import { appConfig } from './config/app.config';
import { getNodeEnv, isDevelopment, isProduction } from '@app/common/utils/runtime-env';

async function bootstrap() {
  const app = await NestFactory.create<NestApplication>(AppModule, {
    logger: isProduction() ? ['log', 'error', 'warn'] : ['debug', 'log', 'verbose', 'warn', 'error'],
    cors: true,
  });

  const httpAdapterHost = app.get(HttpAdapterHost);
  const appConfiguration = appConfig();

  const host = appConfiguration.host;
  const port = appConfiguration.port;
  const apiPrefix = appConfiguration.apiPrefix;

  setupHttpApp(app, httpAdapterHost, { apiPrefix });
  setupSwagger(app, isDevelopment());
  app.enableShutdownHooks();
  registerProcessHooks(app);

  await app.listen(port, host);

  Logger.log(`🚀 NODE_ENV: ${getNodeEnv()}`);
  Logger.log(`🚀 Server is running on ${await app.getUrl()}`);
  Logger.log(`🚀 Swagger is running on ${await app.getUrl()}/swagger`);
}

void bootstrap();
