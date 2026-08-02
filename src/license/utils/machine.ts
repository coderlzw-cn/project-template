import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { isErrorWithCode } from '../../utils/error';

export interface LicenseHardwareProfile {
  board_serial?: string;
  product_uuid?: string;
  cpu_id?: string;
  cpu_model?: string;
}

function readHardwareIdentifierFile(filePath: string, sudoPassword?: string): string {
  try {
    return fs.readFileSync(filePath, 'utf8').trim();
  } catch (error: unknown) {
    if (process.getuid?.() === 0 || !isErrorWithCode(error, 'EACCES')) return '';
    try {
      return execFileSync('sudo', ['-S', '-p', '', 'cat', filePath], {
        encoding: 'utf8',
        input: sudoPassword ? `${sudoPassword}\n` : undefined,
      }).trim();
    } catch {
      return '';
    }
  }
}

function readProcessorId(sudoPassword?: string): string {
  let dmidecodeOutput: string;
  try {
    dmidecodeOutput = execFileSync('dmidecode', ['-t', 'processor'], {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'], // 关闭stderr输出，屏蔽权限警告
    });
  } catch {
    if (process.getuid?.() === 0) return '';
    try {
      dmidecodeOutput = execFileSync('sudo', ['-S', '-p', '', 'dmidecode', '-t', 'processor'], {
        encoding: 'utf8',
        input: sudoPassword ? `${sudoPassword}\n` : undefined,
      });
    } catch {
      return '';
    }
  }
  for (const rawLine of dmidecodeOutput.split('\n')) {
    const processorInfoLine = rawLine.trim();
    if (processorInfoLine.startsWith('ID:')) {
      return processorInfoLine.slice(3).trim();
    }
  }
  return '';
}

function readCpuModel(): string {
  try {
    const cpuInfo = fs.readFileSync('/proc/cpuinfo', 'utf8');
    for (const cpuInfoLine of cpuInfo.split('\n')) {
      if (!cpuInfoLine.startsWith('model name')) continue;
      const separatorIndex = cpuInfoLine.indexOf(':');
      return separatorIndex >= 0 ? cpuInfoLine.slice(separatorIndex + 1).trim() : '';
    }
  } catch {
    return '';
  }
  return '';
}

/** 收集硬件属性（仅保留非空）。 */
export function collectLicenseHardwareProfile(sudoPassword?: string): LicenseHardwareProfile {
  const hardwareIdentifiers: [keyof LicenseHardwareProfile, string][] = [
    ['board_serial', readHardwareIdentifierFile('/sys/class/dmi/id/board_serial', sudoPassword)],
    ['product_uuid', readHardwareIdentifierFile('/sys/class/dmi/id/product_uuid', sudoPassword)],
    ['cpu_id', readProcessorId(sudoPassword)],
    ['cpu_model', readCpuModel()],
  ];
  return hardwareIdentifiers.reduce<LicenseHardwareProfile>((hardwareProfile, [fieldName, fieldValue]) => {
    if (fieldValue && fieldValue.trim().length > 0) {
      hardwareProfile[fieldName] = fieldValue
        .replace(/[\r\n\t]/g, ' ')
        .replace(/\\/g, '\\\\')
        .replace(/=/g, '\\=')
        .trim();
    }
    return hardwareProfile;
  }, {});
}

/**
 * 生成机器码，仅支持 Linux 环境
 */
export function generateMachineId(sudoPassword: string): string {
  if (process.platform !== 'linux') throw new Error('automatic machine ID is only implemented on Linux');
  const hardwareProfile = collectLicenseHardwareProfile(sudoPassword);
  const hardwareIdentifiers = Object.values(hardwareProfile).filter((identifier): identifier is string => !!identifier);
  if (hardwareIdentifiers.length === 0) throw new Error('no usable hardware identifiers found');
  hardwareIdentifiers.sort();
  return crypto.createHash('sha256').update(hardwareIdentifiers.join('\n')).digest('hex');
}
