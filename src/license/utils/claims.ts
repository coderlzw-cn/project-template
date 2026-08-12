import { decodeUnpaddedBase64Url, decodeUnpaddedBase64UrlText } from '@/utils/base64';
import { formatDateTime } from '@/utils/date';
import { parseJsonObject } from '@/utils/json';
import { safeEqual } from '@/utils/string';
import crypto from 'node:crypto';
import { LICENSE_MAX_SIZE } from '../license.config';
import { LicenseClaims, LicenseClaimsValidationOptions, LicenseEnvelope } from '../license.interfaces';

/** 严格解析 JSON Envelope，拒绝未知字段和尾随数据。 */
export function parseLicenseEnvelope(serializedEnvelope: Buffer | string): LicenseEnvelope {
  const envelopeText = typeof serializedEnvelope === 'string' ? serializedEnvelope : serializedEnvelope.toString('utf8');
  let parsedEnvelope: unknown;
  try {
    parsedEnvelope = parseJsonObject(envelopeText, { format: 'json5' });
  } catch (error) {
    throw new Error('invalid token envelope', { cause: error });
  }

  if (typeof parsedEnvelope !== 'object' || parsedEnvelope === null || Array.isArray(parsedEnvelope)) {
    throw new Error('invalid token envelope: must be an object');
  }

  // 检查是否包含未知字段，必须仅包含 payload 和 signature
  const envelopeRecord = parsedEnvelope as Record<string, unknown>;
  for (const fieldName of Object.keys(envelopeRecord)) {
    if (!['payload', 'signature'].includes(fieldName)) {
      throw new Error(`invalid token envelope: unknown field ${fieldName}`);
    }
  }

  if (typeof envelopeRecord.payload !== 'string' || envelopeRecord.payload === '' || typeof envelopeRecord.signature !== 'string' || envelopeRecord.signature === '') {
    throw new Error('invalid token envelope: missing required field');
  }
  return { payload: envelopeRecord.payload, signature: envelopeRecord.signature };
}

// 验证 payload 是否有效，格式是否正确
export function verifyLicensePayload(
  serializedLicense: Buffer | string,
  licensePublicKey: crypto.KeyObject,
  options?: {
    /** license 证书大小（字节） */
    maxSize?: number;
  },
) {
  const licenseBuffer = typeof serializedLicense === 'string' ? Buffer.from(serializedLicense, 'utf8') : serializedLicense;
  if (licenseBuffer.length === 0) throw new Error('许可证数据长度非法');
  if (options?.maxSize) {
    if (licenseBuffer.length > options.maxSize) throw new Error('许可证数据长度非法');
  }

  let licenseEnvelope: LicenseEnvelope;
  try {
    licenseEnvelope = parseLicenseEnvelope(licenseBuffer);
  } catch (error) {
    throw new Error('许可证封包格式错误', { cause: error });
  }

  // 必须先验证原始 payload 的签名，再解析并使用其中的 Claims。如果先信任 payload，攻击者可构造内容触发业务分支，即使最终验签失败。
  let signature: Uint8Array;
  try {
    signature = decodeUnpaddedBase64Url(licenseEnvelope.signature, { allowEmpty: false });
  } catch {
    throw new Error('签名编码格式错误');
  }

  if (signature.length !== 64) throw new Error('签名长度非法');

  if (!crypto.verify(null, Buffer.from(licenseEnvelope.payload, 'utf8'), licensePublicKey, signature)) {
    throw new Error('签名校验失败，许可证可能被篡改');
  }

  let decodedClaims: string;
  try {
    decodedClaims = decodeUnpaddedBase64UrlText(licenseEnvelope.payload, { allowEmpty: false, maxDecodedBytes: LICENSE_MAX_SIZE });
  } catch {
    throw new Error('载荷Base64解码失败');
  }
  try {
    return parseJsonObject<LicenseClaims>(decodedClaims);
  } catch {
    return null;
  }
}

export function verifyLicense(
  serializedLicense: Buffer | string,
  licensePublicKey: crypto.KeyObject,
  options: { machineId?: string; timestamp: number; product: string; audience: string; maxSize?: number; customer: string },
) {
  const claims = verifyLicensePayload(serializedLicense, licensePublicKey, { maxSize: options.maxSize });
  if (!claims) return { claims: null, valid: false };
  validateLicenseClaims(claims, {
    currentMachineId: options.machineId,
    currentTimestamp: options.timestamp,
    expectedProduct: options.product,
    expectedAudience: options.audience,
    expectedCustomer: options.customer,
  });
  return { claims, valid: true };
}

/**
 * 校验许可证载荷声明
 * 校验维度：时间生效区间、产品匹配、受众匹配、机器硬件绑定
 * 注意：仅业务规则校验，签名防篡改需要在上游单独验证
 * @param licenseClaims 解析后的许可证声明载荷
 * @param validationOptions 校验约束配置
 * @throws 校验不通过时抛出中文错误信息
 */
export function validateLicenseClaims(licenseClaims: LicenseClaims, validationOptions: LicenseClaimsValidationOptions) {
  const currentTimestamp = validationOptions.currentTimestamp ?? Date.now();
  const clockSkewMs = validationOptions.clockSkewMs ?? 0;
  const notBeforeTimestamp = licenseClaims.not_before ?? 0;
  const expiresAtTimestamp = licenseClaims.expires_at ?? 0;

  const [beforeDateTime, expiresDateTime] = [formatDateTime(notBeforeTimestamp), formatDateTime(expiresAtTimestamp)];

  // 生效时间不能晚于过期时间，时间区间非法
  if (notBeforeTimestamp !== 0 && expiresAtTimestamp !== 0 && notBeforeTimestamp >= expiresAtTimestamp) {
    const message = `许可证时间区间配置非法：开始生效时间 ${beforeDateTime} 过期时间 ${expiresDateTime}`;
    throw new Error(message);
  }

  // 未到许可证生效时间（兼容时钟偏差）
  if (notBeforeTimestamp !== 0 && currentTimestamp + clockSkewMs < notBeforeTimestamp) {
    const message = `许可证尚未生效：开始生效时间 ${beforeDateTime} 过期时间 ${expiresDateTime}`;
    throw new Error(message);
  }
  // 许可证已过期（兼容时钟偏差）
  if (expiresAtTimestamp !== 0 && currentTimestamp - clockSkewMs >= expiresAtTimestamp) {
    const message = `许可证已过期：开始生效时间 ${beforeDateTime} 过期时间 ${expiresDateTime}`;
    throw new Error(message);
  }
  // 产品标识不匹配
  if (licenseClaims.product !== validationOptions.expectedProduct) {
    throw new Error(`许可证产品标识不匹配：预期 ${licenseClaims.product}，实际 ${validationOptions.expectedProduct}`);
  }

  // 受众标识不匹配
  if (licenseClaims.audience !== validationOptions.expectedAudience) {
    throw new Error(`许可证受众标识不匹配：预期 ${licenseClaims.audience}，实际 ${validationOptions.expectedAudience}`);
  }

  if (licenseClaims.customer !== validationOptions.expectedCustomer) {
    throw new Error(`许可证受众标识不匹配：预期 ${licenseClaims.audience}，实际 ${validationOptions.expectedAudience}`);
  }

  if (licenseClaims.machine_id !== null && licenseClaims.machine_id !== undefined) {
    if (!validationOptions.currentMachineId) throw new Error('设备机器码不存在');
    if (!safeEqual(validationOptions.currentMachineId, licenseClaims.machine_id)) throw new Error('设备机器码与许可证绑定信息不符');
  }
}
