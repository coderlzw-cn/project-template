import { BlockList, isIP, isIPv4, isIPv6 } from 'node:net';

/** 数据库/日志中 IP 字段的最大长度（IPv6 最长 45 字符） */
export const IP_MAX_LENGTH = 45;

/** IPv4 映射到 IPv6 的前缀，例如 `::ffff:127.0.0.1` */
const IPV4_MAPPED_PREFIX = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i;

/**
 * 归一化 IP 地址，用于统一存储、比对和展示：
 * - 去除首尾空白并转小写
 * - 剥离 IPv4 映射前缀（`::ffff:1.2.3.4` -> `1.2.3.4`）
 * - 剥离 IPv6 zone id（`fe80::1%eth0` -> `fe80::1`）
 * - 截断到 {@link IP_MAX_LENGTH} 防止超长脏数据
 * @param ip 原始 IP，允许为空
 * @returns 归一化后的 IP；入参为空或非法时返回 undefined
 */
export function normalizeIp(ip?: string | null): string | undefined {
  if (!ip) return undefined;

  let normalized = ip.trim().toLowerCase();

  const zoneIndex = normalized.indexOf('%');
  if (zoneIndex !== -1) {
    normalized = normalized.slice(0, zoneIndex);
  }

  const mapped = IPV4_MAPPED_PREFIX.exec(normalized);
  if (mapped) {
    normalized = mapped[1];
  }

  normalized = normalized.slice(0, IP_MAX_LENGTH);
  return isIP(normalized) ? normalized : undefined;
}

/**
 * 判断是否为合法 IP（IPv4 或 IPv6）
 */
export function isValidIp(ip?: string | null): boolean {
  return !!ip && isIP(ip.trim()) !== 0;
}

/**
 * 获取 IP 版本
 * @returns 4 | 6，非法 IP 返回 0
 */
export function getIpVersion(ip?: string | null): 0 | 4 | 6 {
  if (!ip) return 0;
  return isIP(ip.trim()) as 0 | 4 | 6;
}

/**
 * 解析 `X-Forwarded-For` 请求头为 IP 数组（从左到右：客户端 -> 各层代理）。
 * 会自动归一化并过滤非法项。
 * @param headerValue 请求头原始值，支持 string / string[]
 */
export function parseForwardedFor(headerValue?: string | string[] | null): string[] {
  if (!headerValue) return [];

  const raw = Array.isArray(headerValue) ? headerValue.join(',') : headerValue;
  return raw
    .split(',')
    .map((item) => normalizeIp(item))
    .filter((item): item is string => !!item);
}

/** 提取客户端 IP 所需的最小请求结构，兼容 Express Request */
interface RequestLike {
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
  socket?: { remoteAddress?: string | null };
}

/**
 * 从请求中提取客户端真实 IP。
 * 优先级：`x-forwarded-for` 首个合法 IP > `x-real-ip` > `req.ip`（依赖 trust proxy）> socket remoteAddress。
 * 结果已归一化（剥离 `::ffff:` 前缀等）。
 * @param request Express Request 或包含 headers/ip/socket 的对象
 * @returns 客户端 IP，无法提取时返回 undefined
 */
export function extractClientIp(request: RequestLike): string | undefined {
  const forwarded = parseForwardedFor(request.headers['x-forwarded-for']);
  if (forwarded.length > 0) return forwarded[0];

  const realIp = request.headers['x-real-ip'];
  const normalizedRealIp = normalizeIp(Array.isArray(realIp) ? realIp[0] : realIp);
  if (normalizedRealIp) return normalizedRealIp;

  return normalizeIp(request.ip) ?? normalizeIp(request.socket?.remoteAddress);
}

/** 内网/保留地址段（RFC 1918、RFC 4193、链路本地等） */
const PRIVATE_RANGES: Array<[string, number, 'ipv4' | 'ipv6']> = [
  ['10.0.0.0', 8, 'ipv4'],
  ['172.16.0.0', 12, 'ipv4'],
  ['192.168.0.0', 16, 'ipv4'],
  ['169.254.0.0', 16, 'ipv4'], // IPv4 链路本地
  ['100.64.0.0', 10, 'ipv4'], // CGNAT
  ['fc00::', 7, 'ipv6'], // IPv6 ULA
  ['fe80::', 10, 'ipv6'], // IPv6 链路本地
];

const privateBlockList = new BlockList();
for (const [network, prefix, family] of PRIVATE_RANGES) {
  privateBlockList.addSubnet(network, prefix, family);
}

/**
 * 判断是否为回环地址（127.0.0.0/8 或 ::1）
 */
export function isLoopbackIp(ip?: string | null): boolean {
  const normalized = normalizeIp(ip);
  if (!normalized) return false;
  if (normalized === '::1') return true;
  return isIPv4(normalized) && normalized.startsWith('127.');
}

/**
 * 判断是否为内网/保留地址（含私有网段、链路本地、CGNAT、ULA，不含回环）
 */
export function isPrivateIp(ip?: string | null): boolean {
  const normalized = normalizeIp(ip);
  if (!normalized) return false;
  return privateBlockList.check(normalized, isIPv6(normalized) ? 'ipv6' : 'ipv4');
}

/**
 * 判断是否为公网地址（合法且非回环、非内网/保留地址）
 */
export function isPublicIp(ip?: string | null): boolean {
  const normalized = normalizeIp(ip);
  if (!normalized) return false;
  return !isLoopbackIp(normalized) && !isPrivateIp(normalized);
}

/**
 * 判断 IP 是否命中指定 CIDR 网段
 * @param ip 待检测 IP
 * @param cidr 网段，如 `192.168.1.0/24`、`2001:db8::/32`；也支持单个 IP
 * @returns 命中返回 true；ip 或 cidr 非法返回 false
 */
export function isIpInCidr(ip?: string | null, cidr?: string | null): boolean {
  if (!cidr) return false;
  const matcher = createIpMatcher([cidr]);
  return matcher(ip);
}

/**
 * 创建 IP 匹配器，用于黑白名单场景。
 * 规则支持三种格式（非法规则会被忽略）：
 * - 单个 IP：`192.168.1.100`、`::1`
 * - CIDR 网段：`10.0.0.0/8`、`2001:db8::/32`
 * - IP 范围：`192.168.1.1-192.168.1.50`
 * @param rules 规则列表
 * @returns 匹配函数，入参为待检测 IP
 * @example
 * const isBlocked = createIpMatcher(['10.0.0.0/8', '203.0.113.7']);
 * isBlocked('10.1.2.3'); // true
 */
export function createIpMatcher(rules: string[]): (ip?: string | null) => boolean {
  const blockList = new BlockList();
  let hasRule = false;

  for (const rule of rules) {
    const trimmed = rule.trim();
    if (!trimmed) continue;

    try {
      if (trimmed.includes('/')) {
        const [network, prefixRaw] = trimmed.split('/');
        const normalizedNetwork = normalizeIp(network);
        const prefix = Number(prefixRaw);
        if (!normalizedNetwork || !Number.isInteger(prefix)) continue;
        blockList.addSubnet(normalizedNetwork, prefix, isIPv6(normalizedNetwork) ? 'ipv6' : 'ipv4');
      } else if (trimmed.includes('-')) {
        const [start, end] = trimmed.split('-').map((item) => normalizeIp(item));
        if (!start || !end || isIPv6(start) !== isIPv6(end)) continue;
        blockList.addRange(start, end, isIPv6(start) ? 'ipv6' : 'ipv4');
      } else {
        const normalized = normalizeIp(trimmed);
        if (!normalized) continue;
        blockList.addAddress(normalized, isIPv6(normalized) ? 'ipv6' : 'ipv4');
      }
      hasRule = true;
    } catch {
      // 非法规则跳过，不影响其余规则
    }
  }

  return (ip?: string | null) => {
    if (!hasRule) return false;
    const normalized = normalizeIp(ip);
    if (!normalized) return false;
    return blockList.check(normalized, isIPv6(normalized) ? 'ipv6' : 'ipv4');
  };
}

/**
 * IP 脱敏（可用于日志、埋点等隐私合规场景）：
 * - IPv4 抹除最后 1 段：`203.0.113.7` -> `203.0.113.0`
 * - IPv6 仅保留前 4 组：`2001:db8:a:b:c:d:e:f` -> `2001:db8:a:b::`
 * @returns 脱敏后的 IP；非法 IP 返回 undefined
 */
export function anonymizeIp(ip?: string | null): string | undefined {
  const normalized = normalizeIp(ip);
  if (!normalized) return undefined;

  if (isIPv4(normalized)) {
    return `${normalized.split('.').slice(0, 3).join('.')}.0`;
  }

  const expanded = expandIpv6(normalized);
  return `${expanded.split(':').slice(0, 4).join(':')}::`;
}

/**
 * 将 IPv4 转换为 32 位无符号整数（可用于范围比较、入库索引）
 * @returns 非法 IPv4 返回 undefined
 */
export function ipv4ToLong(ip?: string | null): number | undefined {
  const normalized = normalizeIp(ip);
  if (!normalized || !isIPv4(normalized)) return undefined;
  return normalized.split('.').reduce((accumulator, octet) => accumulator * 256 + Number(octet), 0);
}

/**
 * 将 32 位无符号整数还原为 IPv4
 * @returns 超出范围返回 undefined
 */
export function longToIpv4(value: number): string | undefined {
  if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) return undefined;
  return [24, 16, 8, 0].map((shift) => (value >>> shift) & 0xff).join('.');
}

/**
 * 将 IPv6 展开为完整 8 组形式（不含前导零压缩）
 * @example expandIpv6('2001:db8::1') // '2001:db8:0:0:0:0:0:1'
 */
export function expandIpv6(ip: string): string {
  const [head, tail = ''] = ip.split('::');
  const headGroups = head ? head.split(':') : [];
  const tailGroups = tail ? tail.split(':') : [];
  const missing = 8 - headGroups.length - tailGroups.length;
  const groups = ip.includes('::') ? [...headGroups, ...Array(missing).fill('0'), ...tailGroups] : headGroups;
  return groups.map((group) => group || '0').join(':');
}
