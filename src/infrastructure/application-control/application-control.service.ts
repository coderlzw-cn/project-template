import { TaskStatus } from '@/constants/enum.constants';
import { deleteProjectEnvVariable, getProjectEnvVariable, listProjectEnvVariables, setProjectEnvVariable } from '@/utils/env';
import { ConflictException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { defer, map, switchMap } from 'rxjs';
import type { ApplicationControlModuleOptions, ApplicationControlTarget, ApplicationStatus } from './application-control.interfaces';
import { APPLICATION_CONTROL_MODULE_OPTIONS } from './application-control.module-definition';

const DEFAULT_SHUTDOWN_TIMEOUT_MS = 10_000;
const DEFAULT_STOP_EXIT_CODE = 0;
const DEFAULT_RESTART_EXIT_CODE = 75;
type ShutdownTaskStatus = typeof TaskStatus.Stopping | typeof TaskStatus.Restarting;

/**
 * 提供当前 Nest 应用的运行状态与进程级控制。
 *
 * restart() 不会在当前进程内重新 bootstrap：它会优雅释放资源后以专用退出码结束，
 * 由 PM2、Docker、systemd 或 Kubernetes 等外部守护程序创建全新进程。
 */
@Injectable()
export class ApplicationControlService {
  private readonly logger = new Logger(ApplicationControlService.name);
  private readonly shutdownTimeoutMs: number;
  private readonly stopExitCode: number;
  private readonly restartExitCode: number;
  private readonly startedAt = new Date(Date.now() - process.uptime() * 1_000);
  private application?: ApplicationControlTarget;
  private state: TaskStatus = TaskStatus.Running;
  private shutdownPromise?: Promise<void>;
  private readonly terminateParentOnStop: boolean;

  constructor(@Inject(APPLICATION_CONTROL_MODULE_OPTIONS) options: Readonly<ApplicationControlModuleOptions>) {
    this.shutdownTimeoutMs = options.shutdownTimeoutMs ?? DEFAULT_SHUTDOWN_TIMEOUT_MS;
    this.stopExitCode = options.stopExitCode ?? DEFAULT_STOP_EXIT_CODE;
    this.restartExitCode = options.restartExitCode ?? DEFAULT_RESTART_EXIT_CODE;
    this.terminateParentOnStop = options.terminateParentOnStop ?? false;

    if (!Number.isInteger(this.shutdownTimeoutMs) || this.shutdownTimeoutMs <= 0) {
      throw new RangeError(`shutdownTimeoutMs must be a positive integer`);
    }
    if (!Number.isInteger(this.stopExitCode) || this.stopExitCode < 0 || this.stopExitCode > 255) {
      throw new RangeError(`stopExitCode must be an integer between 0 and 255`);
    }
    if (!Number.isInteger(this.restartExitCode) || this.restartExitCode < 0 || this.restartExitCode > 255) {
      throw new RangeError(`restartExitCode must be an integer between 0 and 255`);
    }
    if (this.stopExitCode === this.restartExitCode) {
      throw new RangeError('stopExitCode and restartExitCode must be different');
    }
  }

  /** 在 bootstrap 后绑定 Nest 应用实例，使停止前能够执行完整的生命周期清理。 */
  bind(application: ApplicationControlTarget) {
    if (this.application && this.application !== application) {
      throw new Error('Application control target has already been bound');
    }
    this.application = application;
  }

  getStatus(): ApplicationStatus {
    const memory = process.memoryUsage();
    return {
      state: this.state,
      pid: process.pid,
      ppid: process.ppid,
      startedAt: this.startedAt.toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      environment: process.env.NODE_ENV ?? 'development',
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      memory: {
        rss: memory.rss,
        heapTotal: memory.heapTotal,
        heapUsed: memory.heapUsed,
        external: memory.external,
        arrayBuffers: memory.arrayBuffers,
      },
    };
  }

  isShuttingDown() {
    return this.state !== TaskStatus.Running;
  }

  getEnvironmentVariables() {
    return defer(() => listProjectEnvVariables());
  }

  getEnvironmentVariable(name: string) {
    return defer(() => getProjectEnvVariable(name)).pipe(
      map((variable) => {
        if (!variable) throw new NotFoundException(`Environment variable ${name} does not exist`);
        return variable;
      }),
    );
  }

  createEnvironmentVariable(name: string, value: string) {
    return defer(() => getProjectEnvVariable(name)).pipe(
      switchMap((variable) => {
        if (variable) throw new ConflictException(`Environment variable ${name} already exists`);
        return setProjectEnvVariable(name, value);
      }),
    );
  }

  updateEnvironmentVariable(name: string, value: string) {
    return defer(() => getProjectEnvVariable(name)).pipe(
      switchMap((variable) => {
        if (!variable) throw new NotFoundException(`Environment variable ${name} does not exist`);
        return setProjectEnvVariable(name, value);
      }),
    );
  }

  deleteEnvironmentVariable(name: string) {
    return defer(() => deleteProjectEnvVariable(name)).pipe(
      map((deleted) => {
        if (!deleted) throw new NotFoundException(`Environment variable ${name} does not exist`);
        return { name, deleted: true } as const;
      }),
    );
  }

  /** 优雅停止当前进程。守护程序是否再次拉起它由外部重启策略决定。 */
  async stop(): Promise<void> {
    return await this.requestShutdown(TaskStatus.Stopping, this.stopExitCode, this.terminateParentOnStop);
  }

  /** 优雅结束当前进程，由外部守护程序以全新进程完成重启。 */
  async restart(): Promise<void> {
    return await this.requestShutdown(TaskStatus.Restarting, this.restartExitCode, false);
  }

  /**
   * 发起系统关机/退出请求（单例保护与并发互斥）
   * @param nextState 关机过程中的过渡状态标识（如 ShutdownTaskStatus.Stopping）
   * @param exitCode 最终进程退出时使用的退出码（0 表示正常退出，非 0 表示异常退出）
   */
  private async requestShutdown(nextState: ShutdownTaskStatus, exitCode: number, terminateParent: boolean): Promise<void> {
    // 关机是不可逆过程：并发请求复用首次调用，避免重复执行模块销毁钩子或改变退出语义。
    if (this.shutdownPromise) return await this.shutdownPromise;

    this.state = nextState;
    this.logger.warn(`Application is ${nextState}; process will exit with code ${exitCode}`);

    // 初始化并缓存关机 Promise 句柄
    this.shutdownPromise = this.closeAndExit(exitCode, terminateParent);
    return await this.shutdownPromise;
  }

  /**
   * 执行 Nest 容器销毁并最终退出 Node.js 进程（带超时强制退出兜底保障）
   * @param exitCode 进程退出码
   */
  private async closeAndExit(exitCode: number, terminateParent: boolean): Promise<void> {
    let forced = false;

    // 设置平滑关闭超时定时器：若指定时间内未能完成优雅销毁，强制杀掉进程
    const forceExitTimer = setTimeout(() => {
      forced = true;
      this.logger.error(`Graceful shutdown exceeded ${this.shutdownTimeoutMs}ms; forcing process exit`);
      this.terminateParentIfRequested(terminateParent);
      this.exit(exitCode);
    }, this.shutdownTimeoutMs);

    // unref 允许 Node.js 事件循环在没有其他活动句柄时正常退出，不阻碍主进程
    forceExitTimer.unref();

    try {
      // 触发 NestJS 容器 close()，顺次调用全局 OnModuleDestroy 及各种生命周期钩子
      if (this.application) await this.application.close();
      else this.logger.warn('No Nest application is bound; exiting without application lifecycle cleanup');
    } catch (error) {
      // 捕获并记录销毁过程中的异常信息
      const message = error instanceof Error ? (error.stack ?? error.message) : String(error);
      this.logger.error(`Application cleanup failed: ${message}`);
    } finally {
      // 清理超时定时器，更新状态并退出进程
      clearTimeout(forceExitTimer);
      this.state = TaskStatus.Stopped;

      // 若未触发超时强退，则正常通过 exit 退出
      if (!forced) {
        this.terminateParentIfRequested(terminateParent);
        this.exit(exitCode);
      }
    }
  }

  private terminateParentIfRequested(terminateParent: boolean): void {
    if (!terminateParent) return;
    if (process.ppid <= 1) {
      this.logger.warn(`Parent process ${process.ppid} cannot be terminated safely`);
      return;
    }

    try {
      this.logger.warn(`Terminating parent process ${process.ppid}`);
      this.terminateParent(process.ppid);
    } catch (error) {
      const message = error instanceof Error ? (error.stack ?? error.message) : String(error);
      this.logger.error(`Failed to terminate parent process ${process.ppid}: ${message}`);
    }
  }

  /** 单独保留父进程信号出口，避免单元测试影响测试运行器。 */
  protected terminateParent(pid: number): void {
    process.kill(pid, 'SIGTERM');
  }

  /** 单独保留出口方法，便于单元测试隔离真实进程退出。 */
  protected exit(code: number) {
    process.exit(code);
  }
}
