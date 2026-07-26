import { Injectable } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';

/** 不依赖外部服务的进程存活指标。 */
@Injectable()
export class ApplicationHealthIndicator {
  constructor(private readonly healthIndicatorService: HealthIndicatorService) {}

  isHealthy(key: string) {
    return this.healthIndicatorService.check(key).up({ uptimeSeconds: Math.floor(process.uptime()) });
  }
}
