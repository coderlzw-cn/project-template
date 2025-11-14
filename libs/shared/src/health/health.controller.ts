import { Public } from '@app/common/decorations/public.decorator';
import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DiskHealthIndicator, HealthCheck, HealthCheckService, MemoryHealthIndicator } from '@nestjs/terminus';

@ApiTags('健康检查')
@Public()
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly disk: DiskHealthIndicator,
    private readonly memory: MemoryHealthIndicator,
  ) {}

  @ApiOperation({ summary: '检查磁盘', description: '检查磁盘空间是否充足，当磁盘空间小于20%时，返回错误' })
  @Get('disk')
  @HealthCheck()
  checkDisk() {
    return this.health.check([() => this.disk.checkStorage('storage', { path: '/', thresholdPercent: 0.2 })]);
  }

  @ApiOperation({ summary: '检查内存', description: '检查内存使用情况，当内存使用超过28G时，返回错误' })
  @Get('memory')
  @HealthCheck()
  checkMemory() {
    return this.health.check([() => this.memory.checkHeap('memory_heap', 28 * 1024)]);
  }
}
