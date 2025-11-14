import { Module, Global } from '@nestjs/common';
import { ConsulService } from './consul.service';
import { ConfigurableModuleClass } from './consul.module-definition';

@Global()
@Module({
  providers: [ConsulService],
  exports: [ConsulService],
})
export class ConsulModule extends ConfigurableModuleClass {}
