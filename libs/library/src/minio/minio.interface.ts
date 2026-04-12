/**
 * MinIO 模块配置选项
 */
export interface MinioModuleOptions {
  /** MinIO 服务器地址 */
  endPoint: string;
  /** MinIO 服务器端口 */
  port?: number;
  /** 是否使用 SSL */
  useSSL?: boolean;
  /** 访问密钥 */
  accessKey: string;
  /** 秘密密钥 */
  secretKey: string;
  /** 默认存储桶 */
  defaultBucket?: string;
  /** 默认区域 */
  region?: string;
  /** 是否全局模块 */
  isGlobal?: boolean;
  /** 连接超时时间（毫秒） */
  connectTimeout?: number;
  /** 请求超时时间（毫秒） */
  requestTimeout?: number;
}

/**
 * 上传选项
 */
export interface UploadOptions {
  /** 存储桶名称（如果未提供则使用默认存储桶） */
  bucket?: string;
  /** 内容类型 */
  contentType?: string;
  /** 元数据 */
  metadata?: Record<string, string>;
  /** 是否设置为公开访问 */
  isPublic?: boolean;
}

/**
 * 下载选项
 */
export interface DownloadOptions {
  /** 存储桶名称（如果未提供则使用默认存储桶） */
  bucket?: string;
}

/**
 * 预签名 URL 选项
 */
export interface PresignedUrlOptions {
  /** 存储桶名称（如果未提供则使用默认存储桶） */
  bucket?: string;
  /** URL 过期时间（秒） */
  expires?: number;
}

/**
 * 列出对象选项
 */
export interface ListObjectsOptions {
  /** 存储桶名称（如果未提供则使用默认存储桶） */
  bucket?: string;
  /** 前缀 */
  prefix?: string;
  /** 递归列出 */
  recursive?: boolean;
  /** 最大返回数量 */
  maxKeys?: number;
}
