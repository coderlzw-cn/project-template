import { ConfigurableModuleBuilder } from '@nestjs/common';
import type { ConsulModuleOptions } from './consul.interface';

export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } = new ConfigurableModuleBuilder<ConsulModuleOptions>({
  moduleName: 'Consul',
})
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
