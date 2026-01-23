import { Module } from '@nestjs/common';
import { MinioService } from './minio.service';
import { ConfigurableModuleClass } from './minio.module-definition';

@Module({
  providers: [MinioService],
  exports: [MinioService],
})
export class NestMinioModule extends ConfigurableModuleClass {}
