export const BusinessErrorCode = {
  USER_DISABLED: 20001,
  INSUFFICIENT_BALANCE: 30001,
  TOKEN_EXPIRED: 40001,
  PERMISSION_DENIED: 40003,
};

export type BusinessErrorCodeType = (typeof BusinessErrorCode)[keyof typeof BusinessErrorCode];

/**
 * 任务事件类型常量
 */
export const TaskEventType = {
  /** 任务启动事件 */
  Started: 'started',
  /** 任务阶段/步骤变更事件 */
  Stage: 'stage',
  /** 任务日志输出事件 */
  Log: 'log',
} as const;

/** 任务事件类型联合类型 ('started' | 'stage' | 'log') */
export type TaskEventType = (typeof TaskEventType)[keyof typeof TaskEventType];

/**
 * 进程标准输出/错误流类型
 */
export const ProcessStream = {
  Stdout: 'stdout',
  Stderr: 'stderr',
};
export type ProcessStream = (typeof ProcessStream)[keyof typeof ProcessStream];

/**
 * 进程/任务生命周期运行状态
 */
export const TaskStatus = {
  /** 准备/初始化中 */
  Starting: 'starting',
  /** 正在运行 */
  Running: 'running',
  /** 正在停止中 */
  Stopping: 'stopping',
  /** 正在重启中 */
  Restarting: 'restarting',
  /** 已正常停止 */
  Stopped: 'stopped',
  /** 执行失败/异常退出 */
  Failed: 'failed',
} as const;
export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];
