// 用户名正则
export const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,16}$/;
// 密码正则（至少8位，包含大小写字母和数字）
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/;
// 邮箱正则
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// 手机号正则（中国手机号）
export const PHONE_REGEX = /^1[3-9]\d{9}$/;
// URL正则
export const URL_REGEX = /^(https?:\/\/)?([\w-]+(\.[\w-]+)+)(\/[\w-./?%&=]*)?$/;
// UUID正则
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// 日期正则（YYYY-MM-DD）
export const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
// 时间正则（HH:MM:SS）
export const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/;
// 日期时间正则（YYYY-MM-DD HH:MM:SS）
export const DATETIME_REGEX = /^\d{4}-\d{2}-\d{2} ([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/;
// 十六进制颜色正则
export const HEX_COLOR_REGEX = /^#?([a-fA-F0-9]{6}|[a-fA-F0-9]{3})$/;
// IPv4正则
export const IPV4_REGEX = /^(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)){3}$/;
