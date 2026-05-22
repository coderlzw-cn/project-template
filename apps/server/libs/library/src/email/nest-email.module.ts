import { Global, Module } from '@nestjs/common';
import { ConfigurableModuleClass } from './email.module-definition';
import { EmailService } from './email.service';

@Global()
@Module({
  providers: [EmailService],
  exports: [EmailService],
})
export class NestEmailModule extends ConfigurableModuleClass {}
