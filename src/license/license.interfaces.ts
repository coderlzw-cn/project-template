import type { KeyObject } from 'node:crypto';

// license 的状态
export type LicenseState = 'valid' | 'missing' | 'invalid' | 'not-yet-valid' | 'expired';

export interface LicenseStatus {
  valid: boolean;
  state: LicenseState;
  reason?: string;
  claims?: LicenseClaims;
}

/** License 文件的外层签名封装。 */
export interface LicenseEnvelope {
  /** 无填充 Base64URL 编码的 Claims JSON。 */
  payload: string;
  /** Base64URL 编码的 Ed25519 签名。 */
  signature: string;
}

/** License 中经过签名保护的业务授权内容。 */
export interface LicenseClaims {
  /** License 唯一编号。 */
  license_id: string;
  /** 客户名称或客户标识。 */
  customer: string;
  /** 产品名称。 */
  product: string;
  /** 产品版本或授权套餐。 */
  edition?: string;
  /** 功能授权表。 */
  features?: Record<string, boolean>;
  /** 签发时间，Unix 毫秒。 */
  issued_at: number;
  /** 开始生效时间，Unix 毫秒。 */
  not_before?: number;
  /** 过期时间，Unix 毫秒；0 或缺失表示永不过期。 */
  expires_at?: number;
  /** 绑定的机器码。 */
  machine_id?: string;
  /** License 签发方。 */
  issuer: string;
  /** 目标使用程序。 */
  audience: string;
}

/** License 验证选项。 */
export interface VerifyOptions {
  /** 已由资源加载层读取并完成外层结构检查的 License Envelope。 */
  envelope: LicenseEnvelope;
  /** 已由资源加载层创建的公钥对象。 */
  publicKey: KeyObject;
  /** 要求完全匹配的产品名称。 */
  product?: string;
  /** 要求完全匹配的目标使用程序。 */
  audience?: string;
  /** 当前机器码。 */
  machineId?: string;
  /** 当前 Unix 毫秒，默认使用 Date.now()。 */
  now?: number;
  /** 允许的时钟误差毫秒数。 */
  clockSkewMs?: number;
}

/** 未验签的 License 查看结果。 */
export interface InspectResult {
  /** 固定为 false，表示内容未经验证。 */
  verified: false;
  /** 未验签安全警告。 */
  warning: string;
  /** License 外层封装。 */
  envelope: LicenseEnvelope;
  /** 未经验证的 Claims。 */
  claims: LicenseClaims;
}
