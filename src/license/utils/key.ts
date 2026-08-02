import { writeAtomic, writeExclusive } from '@/utils/fs';
import crypto from 'node:crypto';
import fs from 'node:fs';

/** 生成 Ed25519 密钥对（PKCS#8 / SPKI PEM）。 */
export function generateLicenseKeyPair() {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
  return {
    privateKeyPem: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
    publicKeyPem: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
  };
}

/** 将私钥写为仅所有者可读写的 PEM 文件，可选原子覆盖已有文件。 */
export function writeLicensePrivateKey(filePath: string, pemContent: string, overwrite = false): void {
  if (overwrite) writeAtomic(filePath, pemContent, 0o600);
  else writeExclusive(filePath, pemContent, 0o600);
}

/** 将公钥写为普通只读 PEM 文件，可选原子覆盖已有文件。 */
export function writeLicensePublicKey(filePath: string, pemContent: string, overwrite = false): void {
  if (overwrite) writeAtomic(filePath, pemContent, 0o644);
  else writeExclusive(filePath, pemContent, 0o644);
}

/** 从 PEM 文件读取并校验 Ed25519 私钥类型。 */
export function readLicensePrivateKey(filePath: string) {
  const pemContent = fs.readFileSync(filePath);
  const privateKey = crypto.createPrivateKey(pemContent);
  if (privateKey.asymmetricKeyType !== 'ed25519') throw new Error('private key is not Ed25519');
  return privateKey;
}

/** 从 PEM 文件读取并校验 Ed25519 公钥类型。 */
export function readLicensePublicKey(filePath: string) {
  const pemContent = fs.readFileSync(filePath);
  const publicKey = crypto.createPublicKey(pemContent);
  if (publicKey.asymmetricKeyType !== 'ed25519') throw new Error('public key is not Ed25519');
  return publicKey;
}
