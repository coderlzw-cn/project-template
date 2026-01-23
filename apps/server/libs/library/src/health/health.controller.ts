import { Public } from '@app/common/decorations/public.decorator';
import { Controller, Get, OnModuleInit, Req } from '@nestjs/common';
import { AbstractHttpAdapter, HttpAdapterHost } from '@nestjs/core';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DiskHealthIndicator, HealthCheck, HealthCheckService, HttpHealthIndicator, MemoryHealthIndicator } from '@nestjs/terminus';
import type { Request } from 'express';
@ApiTags('健康检查')
@Public()
@Controller('health')
export class HealthController implements OnModuleInit {
  private appInstance: AbstractHttpAdapter<any, any, any>;
  constructor(
    private readonly health: HealthCheckService,
    private readonly disk: DiskHealthIndicator,
    private readonly memory: MemoryHealthIndicator,
    private readonly http: HttpHealthIndicator,
    private readonly httpAdapterHost: HttpAdapterHost,
  ) {}

  onModuleInit() {
    // 获取底层 HTTP 服务器实例（Express/Fastify）
    this.appInstance = this.httpAdapterHost.httpAdapter.getInstance();
  }

  @ApiOperation({ summary: '检查Consul', description: '检查Consul是否正常' })
  @Get()
  checkHealth() {
    return {
      status: 'ok',
    };
  }

  @ApiOperation({
    summary: '检查磁盘',
    description: '检查磁盘空间是否充足，当磁盘空间小于20%时，返回错误',
  })
  @Get('disk')
  @HealthCheck()
  checkDisk() {
    return this.health.check([() => this.disk.checkStorage('storage', { path: '/', thresholdPercent: 0.2 })]);
  }

  @ApiOperation({
    summary: '检查内存',
    description: '检查内存使用情况，当内存使用超过28G时，返回错误',
  })
  @Get('memory')
  @HealthCheck()
  checkMemory() {
    return this.health.check([() => this.memory.checkHeap('memory_heap', 28 * 1024)]);
  }

  @ApiOperation({ summary: '检查HTTP', description: '检查HTTP是否正常' })
  @Get('http')
  @HealthCheck()
  checkHttp(@Req() req: Request) {
    const match = req.originalUrl.match(/^(.*)\//);
    const url = match ? match[1] : req.originalUrl;
    return this.health.check([() => this.http.pingCheck('http', `${req.protocol}://${req.get('host')}${url}`)]);
  }
}
