import { TaskStatus } from '@/constants/enum.constants';
import { describe, expect, it, jest } from '@jest/globals';
import type { Response } from 'express';
import { ApplicationControlController } from './application-control.controller';
import type { ApplicationControlService } from './application-control.service';

function createController() {
  const service = {
    getStatus: jest.fn(),
    getEnvironmentVariables: jest.fn(),
    getEnvironmentVariable: jest.fn(),
    createEnvironmentVariable: jest.fn(),
    updateEnvironmentVariable: jest.fn(),
    deleteEnvironmentVariable: jest.fn(),
    stop: jest.fn(() => Promise.resolve()),
    restart: jest.fn(() => Promise.resolve()),
  };
  return {
    controller: new ApplicationControlController(service as unknown as ApplicationControlService),
    service,
  };
}

function createResponse() {
  let finishListener: (() => void) | undefined;
  const response = {
    once: jest.fn((event: string, listener: () => void) => {
      if (event === 'finish') finishListener = listener;
      return response;
    }),
  };

  return {
    response: response as unknown as Response,
    finish: () => finishListener?.(),
  };
}

describe('ApplicationControlController', () => {
  it('returns the current application status', () => {
    const { controller, service } = createController();
    const status = { state: TaskStatus.Running, pid: 1234 };
    service.getStatus.mockReturnValue(status);

    expect(controller.status()).toBe(status);
  });

  it('delegates environment variable operations to the service', () => {
    const { controller, service } = createController();

    controller.environmentVariables();
    controller.environmentVariable({ name: 'LOG_LEVEL' });
    controller.createEnvironmentVariable({ name: 'LOG_LEVEL', value: 'debug' });
    controller.updateEnvironmentVariable({ name: 'LOG_LEVEL' }, { value: 'info' });
    controller.deleteEnvironmentVariable({ name: 'LOG_LEVEL' });

    expect(service.getEnvironmentVariables).toHaveBeenCalledWith();
    expect(service.getEnvironmentVariable).toHaveBeenCalledWith('LOG_LEVEL');
    expect(service.createEnvironmentVariable).toHaveBeenCalledWith('LOG_LEVEL', 'debug');
    expect(service.updateEnvironmentVariable).toHaveBeenCalledWith('LOG_LEVEL', 'info');
    expect(service.deleteEnvironmentVariable).toHaveBeenCalledWith('LOG_LEVEL');
  });

  it.each([
    ['stop', 'stop'],
    ['restart', 'restart'],
  ] as const)('acknowledges %s before executing it after the response finishes', (controllerMethod, serviceMethod) => {
    const { controller, service } = createController();
    const { response, finish } = createResponse();

    expect(controller[controllerMethod](response)).toEqual({ action: controllerMethod, accepted: true });
    expect(service[serviceMethod]).not.toHaveBeenCalled();

    finish();
    expect(service[serviceMethod]).toHaveBeenCalledTimes(1);
  });
});
