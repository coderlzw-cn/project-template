import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';
import { monitorEventLoopDelay, type IntervalHistogram } from 'node:perf_hooks';

const NANOSECONDS_PER_MILLISECOND = 1_000_000;

/** 持续采集事件循环延迟，并在每次检查后重置统计窗口。 */
@Injectable()
export class EventLoopHealthIndicator implements OnModuleInit, OnModuleDestroy {
  private readonly histogram: IntervalHistogram = monitorEventLoopDelay({ resolution: 20 });

  constructor(private readonly healthIndicatorService: HealthIndicatorService) {}

  onModuleInit() {
    this.histogram.enable();
  }

  onModuleDestroy() {
    this.histogram.disable();
  }

  isHealthy(key: string, thresholdMs: number) {
    const percentile99Ns = this.histogram.percentile(99);
    const lagMs = Number.isFinite(percentile99Ns) ? percentile99Ns / NANOSECONDS_PER_MILLISECOND : 0;
    const roundedLagMs = Math.round(lagMs * 100) / 100;
    const indicator = this.healthIndicatorService.check(key);

    this.histogram.reset();

    if (roundedLagMs > thresholdMs) {
      return indicator.down({ lagMs: roundedLagMs, thresholdMs });
    }

    return indicator.up({ lagMs: roundedLagMs, thresholdMs });
  }
}
