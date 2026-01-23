import { Module, Global } from '@nestjs/common';
import { EmailService } from './email.service';
import { ConfigurableModuleClass } from './email.module-definition';

@Global()
@Module({
  providers: [EmailService],
  exports: [EmailService],
})
export class NestEmailModule extends ConfigurableModuleClass {}
