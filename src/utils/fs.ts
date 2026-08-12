import fs from 'node:fs';
import path from 'node:path';

/**
 * 排他性写入文件（仅当目标文件不存在时写入，拒绝覆盖现有文件）。
 *
 * 利用底层文件系统的 `wx` 标志（O_CREAT | O_EXCL）保障操作原性，
 * 若文件已存在则抛出 `EEXIST` 错误。
 *
 * @param filePath - 目标文件路径
 * @param data - 写入的文件内容（Buffer 或字符串）
 * @param mode - 创建文件的权限掩码（如 `0o600` 读写权限）
 * @throws {Error} 若文件已存在（代码为 ENOENT/EEXIST）或无写入权限时抛出异常
 *
 * @example
 * writeExclusive('/path/to/key.pem', 'secret-key-data', 0o600);
 */
export function writeExclusive(filePath: string, data: Buffer | string, mode: number): void {
  const fd = fs.openSync(filePath, 'wx', mode);
  try {
    fs.writeFileSync(fd, data);
  } finally {
    fs.closeSync(fd);
  }
}

/**
 * 原子性写入文件。
 *
 * 先将数据写入同目录下的临时文件，写入完成后通过重命名（rename）覆盖目标文件。
 * 此方式可确保在进程崩溃或断电时，目标文件要么保持原样，要么完全更新，避免出现半写入损坏。
 * 若中途发生异常，会自动清理由该操作生成的临时文件。
 *
 * @param filePath - 目标文件路径
 * @param data - 写入的文件内容（Buffer 或字符串）
 * @param mode - 创建临时文件及目标文件的权限掩码
 * @throws {Error} 若写入或重命名失败时抛出异常
 *
 * @example
 * writeAtomic('/path/to/config.json', JSON.stringify(config), 0o644);
 */
export function writeAtomic(filePath: string, data: Buffer | string, mode: number) {
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
      // 忽略临时文件清理失败时的异常，继续抛出主异常
    }
    throw error;
  }
}
