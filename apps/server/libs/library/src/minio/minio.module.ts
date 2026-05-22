import { Module } from '@nestjs/common';
import { ConfigurableModuleClass } from './minio.module-definition';
import { MinioService } from './minio.service';

@Module({
  providers: [MinioService],
  exports: [MinioService],
})
export class NestMinioModule extends ConfigurableModuleClass {}
