import { Module } from '@nestjs/common';
import { ConfigurableConsulModule } from './consul.module-definition';
import { ConsulService } from './consul.service';

@Module({
  providers: [ConsulService],
  exports: [ConsulService],
})
export class ConsulModule extends ConfigurableConsulModule {}
