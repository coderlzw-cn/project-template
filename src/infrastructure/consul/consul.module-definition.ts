import { ConfigurableModuleBuilder } from '@nestjs/common';
import type { ConsulModuleOptions } from './consul.interfaces';

export interface ConsulModuleExtras {
  /** 注册为全局模块，业务模块无需重复导入。 */
  isGlobal?: boolean;
}

/** 生成 ConsulModule 的 forRoot、forRootAsync、配置 Token 和异步配置工厂约定。 */
export const {
  ConfigurableModuleClass: ConfigurableConsulModule,
  MODULE_OPTIONS_TOKEN: CONSUL_MODULE_OPTIONS,
  OPTIONS_TYPE: CONSUL_MODULE_OPTIONS_TYPE,
  ASYNC_OPTIONS_TYPE: CONSUL_MODULE_ASYNC_OPTIONS_TYPE,
} = new ConfigurableModuleBuilder<ConsulModuleOptions>({ moduleName: 'Consul' })
  .setClassMethodName('forRoot')
  .setFactoryMethodName('createConsulOptions')
  .setExtras<ConsulModuleExtras>({ isGlobal: false }, (definition, extras) => ({
    ...definition,
    global: extras.isGlobal,
  }))
  .build();
