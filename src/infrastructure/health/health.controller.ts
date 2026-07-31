import { Controller, Get, VERSION_NEUTRAL, Version } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DiskHealthIndicator, HealthCheck, HealthCheckService, MemoryHealthIndicator } from '@nestjs/terminus';
import { SkipThrottle } from '@nestjs/throttler';
import { ApplicationHealthIndicator } from './application.health-indicator';
import { ConfigHealthIndicator } from './config.health-indicator';
import { EventLoopHealthIndicator } from './event-loop.health-indicator';
import { Public } from '../../decorators/public.decorator';
import { SkipTransform } from '../../decorators/skip-transform.decorator';

@ApiTags('Health')
@Public()
@SkipThrottle()
@SkipTransform()
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly application: ApplicationHealthIndicator,
    private readonly memory: MemoryHealthIndicator,
    private readonly disk: DiskHealthIndicator,
    private readonly eventLoop: EventLoopHealthIndicator,
    private readonly config: ConfigHealthIndicator,
  ) {}

  /** 仅判断应用进程是否仍可响应，不依赖外部资源。 */
  @Get('live')
  @Version(VERSION_NEUTRAL)
  @HealthCheck()
  @ApiOperation({ summary: '存活探针' })
  liveness() {
    return this.health.check([() => this.application.isHealthy('application')]);
  }

  /** 检查进程 Heap 与 RSS 内存是否超过阈值。 */
  @Get('memory')
  @Version(VERSION_NEUTRAL)
  @HealthCheck()
  @ApiOperation({ summary: '内存健康检查' })
  memoryHealth() {
    return this.health.check([() => this.memory.checkHeap('memory_heap', 512 * 1024 * 1024), () => this.memory.checkRSS('memory_rss', 1024 * 1024 * 1024)]);
  }

  /** 检查当前工作目录所在磁盘的使用率是否超过阈值。 */
  @Get('disk')
  @Version(VERSION_NEUTRAL)
  @HealthCheck()
  @ApiOperation({ summary: '磁盘健康检查' })
  diskHealth() {
    return this.health.check([() => this.disk.checkStorage('storage', { path: process.cwd(), thresholdPercent: 0.9 })]);
  }

  /** 检查事件循环最近一个采集窗口内的 P99 延迟。 */
  @Get('event-loop')
  @Version(VERSION_NEUTRAL)
  @HealthCheck()
  @ApiOperation({ summary: '事件循环健康检查' })
  eventLoopHealth() {
    return this.health.check([() => this.eventLoop.isHealthy('event_loop', 100)]);
  }

  /** 检查应用核心配置的最终解析结果，不暴露具体配置值。 */
  @Get('config')
  @Version(VERSION_NEUTRAL)
  @HealthCheck()
  @ApiOperation({ summary: '应用配置健康检查' })
  configHealth() {
    return this.health.check([() => this.config.isHealthy('config')]);
  }
}
