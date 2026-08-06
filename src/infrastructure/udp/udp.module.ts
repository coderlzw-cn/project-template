import { Module } from '@nestjs/common';
import { UdpService } from './udp.service';

@Module({
  providers: [UdpService],
  exports: [UdpService],
})
export class UdpModule {}
