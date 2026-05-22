/**
 * 运行时环境判断。务必使用函数而非模块顶层的 const，
 * 否则可能在 .env / ConfigModule 注入之前就被求值（读到 undefined）。
 */
export function getNodeEnv(): string {
  return process.env.NODE_ENV ?? 'development';
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

/** 非 production（含未设置 NODE_ENV，按开发态处理） */
export function isNonProduction(): boolean {
  return process.env.NODE_ENV !== 'production';
}
