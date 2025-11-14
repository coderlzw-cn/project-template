import { Module, Global } from '@nestjs/common';
import { IoredisService } from './ioredis.service';
import { ConfigurableModuleClass } from './ioredis.module-definition';

@Global()
@Module({
  providers: [IoredisService],
  exports: [IoredisService],
})
export class IoredisModule extends ConfigurableModuleClass {}
