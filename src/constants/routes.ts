/**
 * 路由路径常量：集中管理所有路由路径，
 * 路由配置、<Link>、navigate() 都从这里取值，避免硬编码字符串
 */
export const ROUTES = {
  HOME: '/',
  /** 兜底路由，匹配所有未定义路径 */
  NOT_FOUND: '*',
} as const;
