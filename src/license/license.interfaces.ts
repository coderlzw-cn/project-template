export enum LicenseEdition {
  Enterprise = 'enterprise',
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
  edition?: LicenseEdition[];
  /** 功能授权表。 */
  // features?: Record<string, boolean>;
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

export interface LicenseClaimsValidationOptions {
  /** 当前设备机器码，用于硬件绑定校验 */
  currentMachineId?: string;
  /** 当前时间戳(ms)，不传默认使用 Date.now() */
  currentTimestamp: number;
  /** 产品标识，用于匹配许可证产品字段 */
  expectedProduct?: string;
  /** 受众标识，用于匹配许可证受众字段 */
  expectedAudience?: string;
  /** 时钟偏差容忍毫秒数，解决设备时间不一致问题 */
  clockSkewMs?: number;
  /** 客户名称 */
  expectedCustomer: string;
}
