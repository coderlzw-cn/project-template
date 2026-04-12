import { ConfigurableModuleBuilder } from '@nestjs/common';
import type { IoredisModuleOptions } from './ioredis.interface';

export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } = new ConfigurableModuleBuilder<IoredisModuleOptions>({
  moduleName: 'Ioredis',
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
