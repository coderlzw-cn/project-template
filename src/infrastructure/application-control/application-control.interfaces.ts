import type { TaskStatus } from '@/constants/enum.constants';
import type { INestApplication } from '@nestjs/common';

export interface ApplicationControlModuleOptions {
  /** 优雅关闭超时时间，超时后将直接结束进程。 */
  shutdownTimeoutMs?: number;
  /** stop() 使用的进程退出码。 */
  stopExitCode?: number;
  /** restart() 使用的进程退出码，应与 stopExitCode 不同。 */
  restartExitCode?: number;
  /** stop() 时同时结束启动当前应用的父进程，仅建议开发环境开启。 */
  terminateParentOnStop?: boolean;
}

export interface ApplicationMemoryStatus {
  rss: number;
  heapTotal: number;
  heapUsed: number;
  external: number;
  arrayBuffers: number;
}

export interface ApplicationStatus {
  state: TaskStatus;
  pid: number;
  ppid: number;
  startedAt: string;
  uptimeSeconds: number;
  environment: string;
  nodeVersion: string;
  platform: NodeJS.Platform;
  arch: string;
  memory: ApplicationMemoryStatus;
}

/**
 * ApplicationControlService 只依赖 close，便于测试，也避免将具体 HTTP 适配器泄漏到模块内。
 */
export type ApplicationControlTarget = Pick<INestApplication, 'close'>;
