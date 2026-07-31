import { Inject, Injectable } from '@nestjs/common';
import * as config from '@nestjs/config';
import { HealthIndicatorService } from '@nestjs/terminus';
import { appConfig } from '../../config/app.config';

/** 检查应用核心配置的最终解析结果，不在响应中暴露配置值。 */
@Injectable()
export class ConfigHealthIndicator {
  constructor(
    private readonly healthIndicatorService: HealthIndicatorService,
    @Inject(appConfig.KEY)
    private appconfiguration: config.ConfigType<typeof appConfig>,
  ) {}

  isHealthy(key: string) {
    const host = this.appconfiguration.host;
    const port = this.appconfiguration.port;
    const prefixApi = this.appconfiguration.apiPrefix;
    const nodeEnv = this.appconfiguration.env;

    const checks = [
      typeof host === 'string' && host.trim().length > 0,
      typeof port === 'number' && Number.isInteger(port) && port > 0 && port <= 65_535,
      typeof prefixApi === 'string' && prefixApi.trim().length > 0,
      ['development', 'test', 'production'].includes(nodeEnv),
    ];
    const invalidCount = checks.filter((valid) => !valid).length;
    const indicator = this.healthIndicatorService.check(key);

    if (invalidCount > 0) {
      return indicator.down({ invalidCount });
    }

    return indicator.up();
  }
}
