import { ConfigurableModuleBuilder } from '@nestjs/common';
import type { ApplicationControlModuleOptions } from './application-control.interfaces';

export interface ApplicationControlModuleExtras {
  /** 注册为全局模块，业务模块无需重复导入。 */
  isGlobal?: boolean;
}

export const {
  ConfigurableModuleClass: ConfigurableApplicationControlModule,
  MODULE_OPTIONS_TOKEN: APPLICATION_CONTROL_MODULE_OPTIONS,
  OPTIONS_TYPE: APPLICATION_CONTROL_MODULE_OPTIONS_TYPE,
  ASYNC_OPTIONS_TYPE: APPLICATION_CONTROL_MODULE_ASYNC_OPTIONS_TYPE,
} = new ConfigurableModuleBuilder<ApplicationControlModuleOptions>({ moduleName: 'ApplicationControl' })
  .setClassMethodName('forRoot')
  .setFactoryMethodName('createApplicationControlOptions')
  .setExtras<ApplicationControlModuleExtras>({ isGlobal: false }, (definition, extras) => ({
    ...definition,
    global: extras.isGlobal,
  }))
  .build();
