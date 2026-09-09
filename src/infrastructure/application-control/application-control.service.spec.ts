import { TaskStatus } from '@/constants/enum.constants';
import { deleteProjectEnvVariable, getProjectEnvVariable, listProjectEnvVariables, setProjectEnvVariable } from '@/utils/env';
import { describe, expect, it, jest } from '@jest/globals';
import { firstValueFrom } from 'rxjs';
import type { ApplicationControlModuleOptions, ApplicationControlTarget } from './application-control.interfaces';
import { ApplicationControlService } from './application-control.service';

jest.mock('@/utils/env', () => ({
  deleteProjectEnvVariable: jest.fn(),
  getProjectEnvVariable: jest.fn(),
  listProjectEnvVariables: jest.fn(),
  setProjectEnvVariable: jest.fn(),
}));

const mockedDeleteProjectEnvVariable = jest.mocked(deleteProjectEnvVariable);
const mockedGetProjectEnvVariable = jest.mocked(getProjectEnvVariable);
const mockedListProjectEnvVariables = jest.mocked(listProjectEnvVariables);
const mockedSetProjectEnvVariable = jest.mocked(setProjectEnvVariable);

class TestApplicationControlService extends ApplicationControlService {
  readonly exitCodes: number[] = [];
  readonly terminatedParentPids: number[] = [];

  constructor(options: ApplicationControlModuleOptions = {}) {
    super(options);
  }

  protected override exit(code: number): void {
    this.exitCodes.push(code);
  }

  protected override terminateParent(pid: number): void {
    this.terminatedParentPids.push(pid);
  }
}

function createTarget(close: () => Promise<void>): ApplicationControlTarget {
  return { close };
}

describe('ApplicationControlService', () => {
  it('executes environment variable reads lazily through RxJS', async () => {
    const variable = { name: 'LOG_LEVEL', value: 'debug', sensitive: false };
    mockedListProjectEnvVariables.mockResolvedValue([variable]);
    const service = new TestApplicationControlService();

    const variables$ = service.getEnvironmentVariables();
    expect(mockedListProjectEnvVariables).not.toHaveBeenCalled();

    await expect(firstValueFrom(variables$)).resolves.toEqual([variable]);
    expect(mockedListProjectEnvVariables).toHaveBeenCalledTimes(1);
  });

  it('keeps environment variable existence rules in the service', async () => {
    const service = new TestApplicationControlService();
    mockedGetProjectEnvVariable.mockResolvedValueOnce({ name: 'LOG_LEVEL', value: 'debug', sensitive: false }).mockResolvedValueOnce(undefined);
    mockedDeleteProjectEnvVariable.mockResolvedValue(false);

    await expect(firstValueFrom(service.createEnvironmentVariable('LOG_LEVEL', 'info'))).rejects.toThrow('Environment variable LOG_LEVEL already exists');
    await expect(firstValueFrom(service.updateEnvironmentVariable('MISSING', 'info'))).rejects.toThrow('Environment variable MISSING does not exist');
    await expect(firstValueFrom(service.deleteEnvironmentVariable('MISSING'))).rejects.toThrow('Environment variable MISSING does not exist');
    expect(mockedSetProjectEnvVariable).not.toHaveBeenCalled();
  });

  it('returns a safe runtime status snapshot', () => {
    const service = new TestApplicationControlService();

    const status = service.getStatus();

    expect(status).toMatchObject({
      state: TaskStatus.Running,
      pid: process.pid,
      ppid: process.ppid,
      environment: process.env.NODE_ENV ?? 'development',
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
    });
    expect(status.uptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(new Date(status.startedAt).toString()).not.toBe('Invalid Date');
    expect(status.memory.rss).toBeGreaterThan(0);
    expect(service.isShuttingDown()).toBe(false);
  });

  it.each([
    ['stop', 0],
    ['restart', 75],
  ] as const)('closes the application before %s exits with its dedicated code', async (operation, expectedExitCode) => {
    const service = new TestApplicationControlService();
    const close = jest.fn(() => Promise.resolve());
    service.bind(createTarget(close));

    await service[operation]();

    expect(close).toHaveBeenCalledTimes(1);
    expect(service.exitCodes).toEqual([expectedExitCode]);
    expect(service.getStatus().state).toBe(TaskStatus.Stopped);
    expect(service.isShuttingDown()).toBe(true);
  });

  it('keeps the first shutdown intent when stop and restart are requested concurrently', async () => {
    let resolveClose: (() => void) | undefined;
    const close = jest.fn(
      async () =>
        await new Promise<void>((resolve) => {
          resolveClose = resolve;
        }),
    );
    const service = new TestApplicationControlService();
    service.bind(createTarget(close));

    const stopping = service.stop();
    const restarting = service.restart();
    expect(service.getStatus().state).toBe(TaskStatus.Stopping);
    expect(close).toHaveBeenCalledTimes(1);

    resolveClose?.();
    await Promise.all([stopping, restarting]);

    expect(close).toHaveBeenCalledTimes(1);
    expect(service.exitCodes).toEqual([0]);
  });

  it('terminates the watcher parent only when stop explicitly enables it', async () => {
    const service = new TestApplicationControlService({ terminateParentOnStop: true });
    service.bind(createTarget(() => Promise.resolve()));

    await service.stop();

    expect(service.terminatedParentPids).toEqual([process.ppid]);
  });

  it('does not terminate the parent when restarting', async () => {
    const service = new TestApplicationControlService({ terminateParentOnStop: true });
    service.bind(createTarget(() => Promise.resolve()));

    await service.restart();

    expect(service.terminatedParentPids).toEqual([]);
  });

  it('forces an exit when application cleanup exceeds the configured timeout', async () => {
    jest.useFakeTimers();
    let resolveClose: (() => void) | undefined;
    const close = jest.fn(
      async () =>
        await new Promise<void>((resolve) => {
          resolveClose = resolve;
        }),
    );
    const service = new TestApplicationControlService({ shutdownTimeoutMs: 50 });
    service.bind(createTarget(close));

    const stopping = service.stop();
    await jest.advanceTimersByTimeAsync(50);
    expect(service.exitCodes).toEqual([0]);

    resolveClose?.();
    await stopping;
    expect(service.exitCodes).toEqual([0]);
    jest.useRealTimers();
  });

  it('rejects ambiguous stop and restart exit codes', () => {
    expect(() => new TestApplicationControlService({ stopExitCode: 10, restartExitCode: 10 })).toThrow('stopExitCode and restartExitCode must be different');
  });
});
