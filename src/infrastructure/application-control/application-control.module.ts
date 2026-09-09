import { Module } from '@nestjs/common';
import { ApplicationControlController } from './application-control.controller';
import { ConfigurableApplicationControlModule } from './application-control.module-definition';
import { ApplicationControlService } from './application-control.service';

@Module({
  controllers: [ApplicationControlController],
  providers: [ApplicationControlService],
  exports: [ApplicationControlService],
})
export class ApplicationControlModule extends ConfigurableApplicationControlModule {}
