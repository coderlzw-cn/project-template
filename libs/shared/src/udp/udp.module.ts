import { Global, Module } from '@nestjs/common';
import { ConfigurableModuleClass } from './udp.module-definition';
import { UdpService } from './udp.service';

@Global()
@Module({
  providers: [UdpService],
  exports: [UdpService],
})
export class UdpModule extends ConfigurableModuleClass {}
