import { TaskStatus } from '@/constants/enum.constants';
import { ENV_VARIABLE_NAME_PATTERN } from '@/utils/env';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength } from 'class-validator';
import type { ApplicationMemoryStatus, ApplicationStatus } from './application-control.interfaces';

export class ApplicationMemoryStatusDto implements ApplicationMemoryStatus {
  @ApiProperty({ description: '常驻集大小（字节）', example: 104857600 })
  rss: number;

  @ApiProperty({ description: 'V8 已分配堆大小（字节）', example: 52428800 })
  heapTotal: number;

  @ApiProperty({ description: 'V8 已使用堆大小（字节）', example: 36700160 })
  heapUsed: number;

  @ApiProperty({ description: 'V8 管理的外部内存（字节）', example: 2097152 })
  external: number;

  @ApiProperty({ description: 'ArrayBuffer 内存（字节）', example: 1048576 })
  arrayBuffers: number;
}

export class ApplicationStatusDto implements ApplicationStatus {
  @ApiProperty({ enum: Object.values(TaskStatus), enumName: 'TaskStatus', example: TaskStatus.Running })
  state: TaskStatus;

  @ApiProperty({ description: '当前进程 ID', example: 12345 })
  pid: number;

  @ApiProperty({ description: '父进程 ID', example: 1234 })
  ppid: number;

  @ApiProperty({ description: '进程启动时间', example: '2026-09-09T12:00:00.000Z' })
  startedAt: string;

  @ApiProperty({ description: '运行时长（秒）', example: 3600 })
  uptimeSeconds: number;

  @ApiProperty({ description: '当前运行环境', example: 'production' })
  environment: string;

  @ApiProperty({ description: 'Node.js 版本', example: 'v24.8.0' })
  nodeVersion: string;

  @ApiProperty({ description: '操作系统平台', example: 'linux' })
  platform: NodeJS.Platform;

  @ApiProperty({ description: 'CPU 架构', example: 'arm64' })
  arch: string;

  @ApiProperty({ type: ApplicationMemoryStatusDto })
  memory: ApplicationMemoryStatusDto;
}

export class ApplicationControlActionDto {
  @ApiProperty({ enum: ['stop', 'restart'], example: 'restart' })
  action: 'stop' | 'restart';

  @ApiProperty({ example: true })
  accepted: true;
}

export class ApplicationStatusResponseDto {
  @ApiProperty({ example: 200 })
  code: number;

  @ApiProperty({ example: '请求成功' })
  message: string;

  @ApiProperty({ type: ApplicationStatusDto })
  data: ApplicationStatusDto;
}

export class ApplicationControlActionResponseDto {
  @ApiProperty({ example: 202 })
  code: number;

  @ApiProperty({ example: '请求成功' })
  message: string;

  @ApiProperty({ type: ApplicationControlActionDto })
  data: ApplicationControlActionDto;
}

export class EnvironmentVariableParamDto {
  @ApiProperty({ description: '环境变量名', example: 'LOG_LEVEL', maxLength: 128 })
  @MaxLength(128)
  @Matches(ENV_VARIABLE_NAME_PATTERN)
  @IsString()
  name: string;
}

export class CreateEnvironmentVariableDto extends EnvironmentVariableParamDto {
  @ApiProperty({ description: '环境变量值，允许空字符串', example: 'debug', maxLength: 32768 })
  @MaxLength(32768)
  @IsString()
  value: string;
}

export class UpdateEnvironmentVariableDto {
  @ApiProperty({ description: '新的环境变量值，允许空字符串', example: 'info', maxLength: 32768 })
  @MaxLength(32768)
  @IsString()
  value: string;
}

export class ProjectEnvironmentVariableDto {
  @ApiProperty({ example: 'LOG_LEVEL' })
  name: string;

  @ApiProperty({ description: '敏感变量返回 ********', example: 'info' })
  value: string;

  @ApiProperty({ description: '是否已被判定为敏感变量', example: false })
  sensitive: boolean;
}

export class ProjectEnvironmentVariableResponseDto {
  @ApiProperty({ example: 200 })
  code: number;

  @ApiProperty({ example: '请求成功' })
  message: string;

  @ApiProperty({ type: ProjectEnvironmentVariableDto })
  data: ProjectEnvironmentVariableDto;
}

export class ProjectEnvironmentVariableListResponseDto {
  @ApiProperty({ example: 200 })
  code: number;

  @ApiProperty({ example: '请求成功' })
  message: string;

  @ApiProperty({ type: ProjectEnvironmentVariableDto, isArray: true })
  data: ProjectEnvironmentVariableDto[];
}

export class DeleteEnvironmentVariableResultDto {
  @ApiProperty({ example: 'LOG_LEVEL' })
  name: string;

  @ApiProperty({ example: true })
  deleted: true;
}

export class DeleteEnvironmentVariableResponseDto {
  @ApiProperty({ example: 200 })
  code: number;

  @ApiProperty({ example: '请求成功' })
  message: string;

  @ApiProperty({ type: DeleteEnvironmentVariableResultDto })
  data: DeleteEnvironmentVariableResultDto;
}
