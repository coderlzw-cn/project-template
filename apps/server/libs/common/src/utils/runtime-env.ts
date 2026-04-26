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
