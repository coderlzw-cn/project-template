import { Global, Module } from '@nestjs/common';
import { ConfigurableModuleClass } from './consul.module-definition';
import { ConsulService } from './consul.service';

@Global()
@Module({
  providers: [ConsulService],
  exports: [ConsulService],
})
export class NestConsulModule extends ConfigurableModuleClass {}
