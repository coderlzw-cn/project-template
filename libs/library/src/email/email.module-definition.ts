import { ConfigurableModuleBuilder } from '@nestjs/common';
import type { EmailModuleOptions } from './email.interface';

export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } = new ConfigurableModuleBuilder<EmailModuleOptions>({ moduleName: 'Email' })
  .setClassMethodName('forRoot')
  .setFactoryMethodName('useFactory')
  .setExtras(
    {
      isGlobal: true,
    },
    (definition, extras) => ({
      ...definition,
      global: extras.isGlobal,
    }),
  )
  .build();
