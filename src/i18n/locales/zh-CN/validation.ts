export default {
  // 通用
  required: "此字段为必填项",
  invalid: "输入内容无效",
  invalidType: "数据类型不正确",
  invalidValue: "输入值不在允许范围内",
  custom: "输入内容不符合要求",

  // 字符串
  string: {
    min: "至少输入 {{minimum}} 个字符",
    max: "最多输入 {{maximum}} 个字符",
    length: "必须输入 {{length}} 个字符",
    nonempty: "不能为空",
    includes: "必须包含 {{value}}",
    startsWith: "必须以 {{prefix}} 开头",
    endsWith: "必须以 {{suffix}} 结尾",
    regex: "格式不正确",
    lowercase: "只能包含小写字母",
    uppercase: "只能包含大写字母",
  },

  // 字符串格式
  format: {
    email: "邮箱格式不正确",
    url: "URL 格式不正确",
    httpUrl: "必须是有效的 HTTP 或 HTTPS 地址",
    hostname: "主机名格式不正确",
    e164: "手机号格式不正确",
    emoji: "必须是有效的 Emoji",
    uuid: "UUID 格式不正确",
    guid: "GUID 格式不正确",
    nanoid: "Nano ID 格式不正确",
    cuid: "CUID 格式不正确",
    cuid2: "CUID2 格式不正确",
    ulid: "ULID 格式不正确",
    xid: "XID 格式不正确",
    ksuid: "KSUID 格式不正确",
    ipv4: "IPv4 地址格式不正确",
    ipv6: "IPv6 地址格式不正确",
    cidrv4: "IPv4 CIDR 格式不正确",
    cidrv6: "IPv6 CIDR 格式不正确",
    mac: "MAC 地址格式不正确",
    base64: "Base64 格式不正确",
    base64url: "Base64URL 格式不正确",
    hex: "十六进制格式不正确",
    jwt: "JWT 格式不正确",
    creditCard: "银行卡号格式不正确",
    currencyCode: "货币代码格式不正确",
    iban: "IBAN 格式不正确",
    hash: "哈希值格式不正确",
    isoDate: "日期格式不正确，应为 YYYY-MM-DD",
    isoTime: "时间格式不正确",
    isoDateTime: "日期时间格式不正确",
    isoDuration: "时间间隔格式不正确",
  },

  // 数字
  number: {
    min: "不能小于 {{minimum}}",
    max: "不能大于 {{maximum}}",
    greaterThan: "必须大于 {{minimum}}",
    lessThan: "必须小于 {{maximum}}",
    integer: "必须是整数",
    safeInteger: "必须是安全整数",
    positive: "必须是正数",
    nonnegative: "不能是负数",
    negative: "必须是负数",
    nonpositive: "不能是正数",
    multipleOf: "必须是 {{divisor}} 的倍数",
    finite: "必须是有限数值",
  },

  // 大整数
  bigint: {
    min: "不能小于 {{minimum}}",
    max: "不能大于 {{maximum}}",
    greaterThan: "必须大于 {{minimum}}",
    lessThan: "必须小于 {{maximum}}",
    positive: "必须是正整数",
    nonnegative: "不能是负数",
    negative: "必须是负整数",
    nonpositive: "不能是正数",
    multipleOf: "必须是 {{divisor}} 的倍数",
  },

  // 日期
  date: {
    invalid: "日期无效",
    min: "不能早于 {{minimum}}",
    max: "不能晚于 {{maximum}}",
  },

  // 数组
  array: {
    min: "至少需要 {{minimum}} 项",
    max: "最多允许 {{maximum}} 项",
    length: "必须包含 {{length}} 项",
    nonempty: "至少需要一项",
  },

  // 对象
  object: {
    unrecognizedKeys: "存在不允许的字段：{{keys}}",
  },

  // 枚举、字面量
  enum: {
    invalid: "请选择有效的选项",
    literal: "输入值不符合要求",
  },

  // 联合类型
  union: {
    invalid: "输入内容不符合任何一种允许的格式",
  },

  // Map / Set
  collection: {
    min: "至少需要 {{minimum}} 项",
    max: "最多允许 {{maximum}} 项",
    size: "必须包含 {{size}} 项",
    invalidKey: "集合中的键无效",
    invalidElement: "集合中的元素无效",
  },

  // 文件
  file: {
    min: "文件大小不能小于 {{minimum}}",
    max: "文件大小不能超过 {{maximum}}",
    mime: "文件类型不受支持",
    invalid: "文件无效",
  },

  // 通用边界错误
  tooSmall: {
    string: "长度不能小于 {{minimum}}",
    number: "不能小于 {{minimum}}",
    bigint: "不能小于 {{minimum}}",
    date: "日期不能早于 {{minimum}}",
    array: "至少需要 {{minimum}} 项",
    set: "至少需要 {{minimum}} 项",
    map: "至少需要 {{minimum}} 项",
    file: "文件大小不能小于 {{minimum}}",
  },

  tooBig: {
    string: "长度不能超过 {{maximum}}",
    number: "不能大于 {{maximum}}",
    bigint: "不能大于 {{maximum}}",
    date: "日期不能晚于 {{maximum}}",
    array: "最多允许 {{maximum}} 项",
    set: "最多允许 {{maximum}} 项",
    map: "最多允许 {{maximum}} 项",
    file: "文件大小不能超过 {{maximum}}",
  },

  // 数值精度
  notMultipleOf: "必须是 {{divisor}} 的倍数",

  // 其他 Zod 错误
  unrecognizedKeys: "存在不允许的字段：{{keys}}",
  invalidUnion: "输入内容不符合任何一种允许的格式",
  invalidKey: "对象或集合中的键无效",
  invalidElement: "对象或集合中的元素无效",
  invalidFormat: "格式不正确",

  isEmail: "邮箱格式不正确",
  isNotEmpty: "不能为空",
  isString: "必须是字符串",
  matches: "格式不正确",
} as const;
