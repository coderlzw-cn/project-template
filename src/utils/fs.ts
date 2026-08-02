import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { isErrorWithCode } from './error';

/** 仅当目标不存在时写入；拒绝覆盖。 */
export function writeExclusive(filePath: string, data: Buffer | string, mode: number): void {
  const fd = fs.openSync(filePath, 'wx', mode);
  try {
    fs.writeFileSync(fd, data);
  } finally {
    fs.closeSync(fd);
  }
}

/** 先写临时文件再 rename，原子替换目标。 */
export function writeAtomic(filePath: string, data: Buffer | string, mode: number): void {
  const dir = path.dirname(filePath);
  const base = path.basename(filePath);
  const tempPath = path.join(dir, `.${base}.tmp-${process.pid}-${Date.now()}`);
  try {
    fs.writeFileSync(tempPath, data, { mode });
    fs.renameSync(tempPath, filePath);
  } catch (error) {
    try {
      fs.unlinkSync(tempPath);
    } catch {
      // ignore cleanup errors
    }
    throw error;
  }
}

export function existingFiles(...paths: string[]): string[] {
  const existing: string[] = [];
  for (const filePath of paths) {
    try {
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        throw new Error(`密钥路径不能是目录: ${filePath}`);
      }
      existing.push(filePath);
    } catch (error: unknown) {
      if (isErrorWithCode(error, 'ENOENT')) continue;
      if (error instanceof Error && error.message.startsWith('密钥路径不能是目录')) throw error;
      throw new Error(`check ${filePath}: ${error}`);
    }
  }
  return existing;
}

export function hostnameHint(): string {
  return os.hostname();
}
