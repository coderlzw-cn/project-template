import { Module } from '@nestjs/common';
import { ConfigurableModuleClass } from './ioredis.module-definition';
import { IoredisService } from './ioredis.service';

/** 是否全局由 forRoot 第二参 `{ isGlobal }` 控制（默认 true），勿在此重复 @Global */
@Module({
  providers: [IoredisService],
  exports: [IoredisService],
})
export class NestIoredisModule extends ConfigurableModuleClass {}
