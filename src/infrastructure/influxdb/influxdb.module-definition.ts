import { ConfigurableModuleBuilder } from '@nestjs/common';
import type { InfluxdbModuleOptions } from './influxdb.interfaces';

export interface InfluxdbModuleExtras {
  /** 注册为全局模块，业务模块无需重复导入。 */
  isGlobal?: boolean;
}

/**
 * 生成 InfluxdbModule 的 forRoot、forRootAsync、配置 Token 和异步工厂约定。
 * extras 不会注入 InfluxdbService，只用于改变动态模块定义。
 */
export const {
  ConfigurableModuleClass: ConfigurableInfluxdbModule,
  MODULE_OPTIONS_TOKEN: INFLUXDB_MODULE_OPTIONS,
  OPTIONS_TYPE: INFLUXDB_MODULE_OPTIONS_TYPE,
  ASYNC_OPTIONS_TYPE: INFLUXDB_MODULE_ASYNC_OPTIONS_TYPE,
} = new ConfigurableModuleBuilder<InfluxdbModuleOptions>({
  moduleName: 'Influxdb',
})
  .setClassMethodName('forRoot')
  .setFactoryMethodName('createInfluxdbOptions')
  .setExtras<InfluxdbModuleExtras>({ isGlobal: false }, (definition, extras) => ({
    ...definition,
    global: extras.isGlobal,
  }))
  .build();
