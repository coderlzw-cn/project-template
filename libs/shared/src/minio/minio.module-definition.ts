import { ConfigurableModuleBuilder } from '@nestjs/common';
import type { MinioModuleOptions } from './minio.interface';

export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } = new ConfigurableModuleBuilder<MinioModuleOptions>({
  moduleName: 'Minio',
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
