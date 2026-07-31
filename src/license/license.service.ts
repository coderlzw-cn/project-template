import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { createPublicKey, verify } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import { licenseConfig } from '../config/app.config';
import { decodeUnpaddedBase64Url, decodeUnpaddedBase64UrlText } from '../utils/base64';
import { parseJsonObject } from '../utils/json';
import { isValidNumber } from '../utils/number';
import { safeEqual } from '../utils/string';
import type { InspectResult, LicenseClaims, LicenseEnvelope, LicenseState, LicenseStatus, VerifyOptions } from './license.interfaces';

const MAX_LICENSE_SIZE = 64 * 1024;
const SIGNING_CONTEXT = 'xxxxxx';

/*
 * 应用只负责验证 License，不提供密钥或 License 的生成功能。
 * 这里使用 RFC 8032 测试向量中的公钥作为开发占位，接入真实签发端时必须替换为
 * 与签发私钥对应的 Ed25519 公钥。
 */
const LICENSE_PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEA11qYAYKxCrfVS/7TyWQHOg7hcvPapiMlrwIaaPcHURo=
-----END PUBLIC KEY-----`;

const EXPECTED_PRODUCT = 'Open5G';
const EXPECTED_AUDIENCE = 'open5g';
const CURRENT_MACHINE_ID = '1234';

class LicenseVerificationError extends Error {
  constructor(
    readonly state: Exclude<LicenseState, 'valid' | 'missing'>,
    message: string,
  ) {
    super(message);
    this.name = LicenseVerificationError.name;
  }
}

@Injectable()
export class LicenseService {
  private readonly logger = new Logger(LicenseService.name);

  // 文件内容只在应用启动时加载一次，更换 License 文件后需要重启应用。
  private readonly loadedStatus: LicenseStatus;

  constructor(
    @Inject(licenseConfig.KEY)
    private readonly licenseConfiguration: ConfigType<typeof licenseConfig>,
  ) {
    this.loadedStatus = this.loadLicense();

    const status = this.getStatus();
    if (!status.valid) {
      this.logger.error(`License validation failed: ${status.reason ?? status.state}`);
    }
  }

  /**
   * 返回当前 License 状态。文件和签名不重复加载，但有效期会按当前时间重新检查。
   */
  getStatus(): LicenseStatus {
    if (!this.loadedStatus.valid || !this.loadedStatus.claims) return this.loadedStatus;

    try {
      this.validateValidityPeriod(this.loadedStatus.claims, Date.now(), 0);
      return this.loadedStatus;
    } catch (error: unknown) {
      if (error instanceof LicenseVerificationError) {
        return this.failure(error.state, error.message, this.loadedStatus.claims);
      }
      const reason = error instanceof Error ? error.message : 'Unknown License validation error';
      return this.failure('invalid', reason, this.loadedStatus.claims);
    }
  }

  /**
   * 负责定位和读取外部资源，然后把已加载的数据交给 verifyLicense。
   */
  private loadLicense(): LicenseStatus {
    const configuredPath = this.licenseConfiguration.path;
    if (!configuredPath) return this.failure('missing', 'LICENSE_PATH is not configured');

    const licensePath = isAbsolute(configuredPath) ? configuredPath : resolve(process.cwd(), configuredPath);

    try {
      const envelope = this.readEnvelope(licensePath);
      const publicKey = createPublicKey(LICENSE_PUBLIC_KEY_PEM);
      const claims = this.verifyLicense({
        envelope,
        publicKey,
        product: EXPECTED_PRODUCT,
        audience: EXPECTED_AUDIENCE,
        machineId: CURRENT_MACHINE_ID,
      });

      return {
        valid: true,
        state: 'valid',
        claims,
      };
    } catch (error: unknown) {
      if (this.hasErrorCode(error, 'ENOENT')) {
        return this.failure('missing', 'License file does not exist');
      }
      if (error instanceof LicenseVerificationError) {
        return this.failure(error.state, error.message);
      }
      const reason = error instanceof Error ? error.message : 'Unknown License loading error';
      return this.failure('invalid', reason);
    }
  }

  /**
   * 只读取 License 内容，不验证签名。
   *
   * 返回值不能用于功能授权、有效期判断或身份判断。
   */
  private inspectLicense(licensePath: string): InspectResult {
    const envelope = this.readEnvelope(licensePath);
    const payload = decodeUnpaddedBase64UrlText(envelope.payload, {
      allowEmpty: false,
      fieldName: 'License Envelope.payload',
      maxDecodedBytes: MAX_LICENSE_SIZE,
    });

    return {
      verified: false,
      warning: '内容尚未验签，不能作为授权依据',
      envelope,
      claims: this.parseClaims(payload),
    };
  }

  /**
   * 读取并解析 License Envelope。该方法只负责资源加载和外层格式检查。
   */
  private readEnvelope(licensePath: string): LicenseEnvelope {
    const stat = statSync(licensePath);
    if (!stat.isFile()) throw new Error('Configured License path is not a file');
    if (stat.size <= 0 || stat.size > MAX_LICENSE_SIZE) {
      throw new Error(`License 文件为空或超过 ${MAX_LICENSE_SIZE} 字节`);
    }

    const parsed = parseJsonObject<Record<string, unknown>>(readFileSync(licensePath, 'utf8'), {
      fieldName: 'License Envelope',
      format: 'json',
    });
    const allowedFields = new Set(['payload', 'signature']);
    if (Object.keys(parsed).some((field) => !allowedFields.has(field))) {
      throw new Error('License Envelope 包含未知字段');
    }
    if (!this.isNonEmptyString(parsed.payload) || !this.isNonEmptyString(parsed.signature)) {
      throw new Error('License Envelope 缺少有效的 payload 或 signature');
    }

    return {
      payload: parsed.payload,
      signature: parsed.signature,
    };
  }

  /**
   * 只验证调用方已经加载好的 Envelope 和公钥，不读取文件或其他外部资源。
   */
  private verifyLicense(options: VerifyOptions): LicenseClaims {
    const { envelope, publicKey, product = '', audience = '', machineId = '', now = Date.now(), clockSkewMs = 0 } = options;

    if (!isValidNumber(now, { safeInteger: true })) {
      throw new LicenseVerificationError('invalid', 'now 必须是 Unix 毫秒整数');
    }
    if (!isValidNumber(clockSkewMs, { minimum: 0, safeInteger: true })) {
      throw new LicenseVerificationError('invalid', 'clockSkewMs 必须是非负整数');
    }
    if (publicKey.asymmetricKeyType !== 'ed25519') {
      throw new LicenseVerificationError('invalid', '公钥不是 Ed25519 公钥');
    }

    const signingInput = Buffer.from(`${SIGNING_CONTEXT}\n${envelope.payload}`, 'utf8');
    const signature = decodeUnpaddedBase64Url(envelope.signature, {
      allowEmpty: false,
      fieldName: 'License Envelope.signature',
      maxDecodedBytes: MAX_LICENSE_SIZE,
    });

    if (signature.length !== 64) {
      throw new LicenseVerificationError('invalid', 'License 签名长度无效');
    }
    if (!verify(null, signingInput, publicKey, signature)) {
      throw new LicenseVerificationError('invalid', 'License 签名无效');
    }

    // Payload 只有在签名通过后才允许被解析和用于授权判断。
    const payload = decodeUnpaddedBase64UrlText(envelope.payload, {
      allowEmpty: false,
      fieldName: 'License Envelope.payload',
      maxDecodedBytes: MAX_LICENSE_SIZE,
    });
    const claims = this.parseClaims(payload);

    this.validateValidityPeriod(claims, now, clockSkewMs);

    if (product && claims.product !== product) {
      throw new LicenseVerificationError('invalid', `产品不匹配: 期望 ${product}，实际 ${claims.product}`);
    }
    if (audience && claims.audience !== audience) {
      throw new LicenseVerificationError('invalid', `目标使用程序不匹配: 期望 ${audience}，实际 ${claims.audience}`);
    }
    if (claims.machine_id) {
      if (!machineId) {
        throw new LicenseVerificationError('invalid', 'License 已绑定机器，但没有提供当前机器码');
      }
      if (!safeEqual(claims.machine_id, machineId)) {
        throw new LicenseVerificationError('invalid', 'License 绑定的机器码不匹配');
      }
    }

    return claims;
  }

  private parseClaims(payload: string): LicenseClaims {
    const parsed = parseJsonObject<Record<string, unknown>>(payload, {
      fieldName: 'License Claims',
      format: 'json',
    });

    if (
      !this.isNonEmptyString(parsed.license_id) ||
      !this.isNonEmptyString(parsed.customer) ||
      !this.isNonEmptyString(parsed.product) ||
      !isValidNumber(parsed.issued_at, { minimum: 0, safeInteger: true }) ||
      !this.isNonEmptyString(parsed.issuer) ||
      !this.isNonEmptyString(parsed.audience)
    ) {
      throw new LicenseVerificationError('invalid', 'License Claims 缺少必填字段或字段类型无效');
    }
    if (parsed.edition !== undefined && !this.isNonEmptyString(parsed.edition)) {
      throw new LicenseVerificationError('invalid', 'License Claims.edition 无效');
    }
    if (parsed.machine_id !== undefined && !this.isNonEmptyString(parsed.machine_id)) {
      throw new LicenseVerificationError('invalid', 'License Claims.machine_id 无效');
    }
    if (parsed.not_before !== undefined && !isValidNumber(parsed.not_before, { minimum: 0, safeInteger: true })) {
      throw new LicenseVerificationError('invalid', 'License Claims.not_before 无效');
    }
    if (parsed.expires_at !== undefined && !isValidNumber(parsed.expires_at, { minimum: 0, safeInteger: true })) {
      throw new LicenseVerificationError('invalid', 'License Claims.expires_at 无效');
    }
    if (parsed.features !== undefined && !this.isBooleanRecord(parsed.features)) {
      throw new LicenseVerificationError('invalid', 'License Claims.features 必须是布尔值映射');
    }

    return {
      license_id: parsed.license_id,
      customer: parsed.customer,
      product: parsed.product,
      edition: parsed.edition,
      features: parsed.features,
      issued_at: parsed.issued_at,
      not_before: parsed.not_before,
      expires_at: parsed.expires_at,
      machine_id: parsed.machine_id,
      issuer: parsed.issuer,
      audience: parsed.audience,
    };
  }

  private validateValidityPeriod(claims: LicenseClaims, now: number, clockSkewMs: number): void {
    const notBefore = claims.not_before ?? 0;
    const expiresAt = claims.expires_at ?? 0;

    if (notBefore !== 0 && expiresAt !== 0 && notBefore >= expiresAt) {
      throw new LicenseVerificationError('invalid', 'License 时间范围无效');
    }
    if (expiresAt !== 0 && claims.issued_at >= expiresAt) {
      throw new LicenseVerificationError('invalid', 'License 签发时间不能晚于或等于过期时间');
    }
    if (notBefore !== 0 && now + clockSkewMs < notBefore) {
      throw new LicenseVerificationError('not-yet-valid', 'License 尚未生效');
    }
    if (expiresAt !== 0 && now - clockSkewMs >= expiresAt) {
      throw new LicenseVerificationError('expired', 'License 已过期');
    }
  }

  private failure(state: Exclude<LicenseState, 'valid'>, reason: string, claims?: LicenseClaims): LicenseStatus {
    return {
      valid: false,
      state,
      reason,
      ...(claims ? { claims } : {}),
    };
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0;
  }

  private isBooleanRecord(value: unknown): value is Record<string, boolean> {
    return this.isRecord(value) && Object.values(value).every((enabled) => typeof enabled === 'boolean');
  }

  private hasErrorCode(error: unknown, expectedCode: string): boolean {
    return this.isRecord(error) && error.code === expectedCode;
  }
}
