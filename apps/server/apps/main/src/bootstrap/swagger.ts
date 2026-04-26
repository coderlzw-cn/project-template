import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { getNodeEnv } from '@app/common/utils/runtime-env';

export function setupSwagger(app: INestApplication, enabled: boolean) {
  if (!enabled) {
    return;
  }

  const swaggerOptions = new DocumentBuilder()
    .setTitle('API Documentation')
    .setDescription(
      `
    当前环境: ${getNodeEnv()}
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
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'My Project API',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      displayResponseHeaders: true,
      filter: true,
      operationsSorter: 'alpha',
      tagsSorter: 'alpha',
    },
  });
}
