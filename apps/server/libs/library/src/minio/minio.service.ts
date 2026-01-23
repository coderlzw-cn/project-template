import { Injectable, Logger, Inject, Optional, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as Minio from 'minio';
import type { BucketItemStat, BucketItemFromList } from 'minio';
import type { Readable } from 'stream';
import type { MinioModuleOptions, UploadOptions, DownloadOptions, PresignedUrlOptions, ListObjectsOptions } from './minio.interface';
import { MODULE_OPTIONS_TOKEN } from './minio.module-definition';

@Injectable()
export class MinioService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MinioService.name);
  private client: Minio.Client | null = null;
  private defaultBucket: string;

  constructor(
    @Inject(MODULE_OPTIONS_TOKEN)
    @Optional()
    private readonly options?: MinioModuleOptions,
  ) {
    if (options) {
      this.initClient();
      this.defaultBucket = options.defaultBucket ?? '';
    }
  }

  onModuleInit() {
    if (this.client) {
      this.logger.log(`MinIO client initialized: ${this.options?.endPoint}:${this.options?.port ?? 9000}`);
    }
  }

  onModuleDestroy() {
    // MinIO 客户端不需要显式关闭连接
    this.logger.log('MinIO client destroyed');
  }

  /**
   * 初始化 MinIO 客户端
   */
  private initClient() {
    try {
      if (!this.options) {
        throw new Error('MinIO module options are not configured');
      }

      const clientOptions: Minio.ClientOptions = {
        endPoint: this.options.endPoint,
        port: this.options.port,
        useSSL: this.options.useSSL ?? false,
        accessKey: this.options.accessKey,
        secretKey: this.options.secretKey,
        region: this.options.region,
      };

      this.client = new Minio.Client(clientOptions);

      this.logger.log(`MinIO client created: ${this.options.endPoint}:${this.options.port ?? 9000}`);
    } catch (error) {
      this.logger.error(`Failed to initialize MinIO client: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * 获取 MinIO 客户端实例
   */
  getClient(): Minio.Client {
    if (!this.client) {
      throw new Error('MinIO client is not initialized. Please configure the MinIO module first.');
    }
    return this.client;
  }

  /**
   * 检查存储桶是否存在
   * @param bucketName 存储桶名称
   */
  async bucketExists(bucketName: string): Promise<boolean> {
    try {
      return await this.getClient().bucketExists(bucketName);
    } catch (error) {
      this.logger.error(`Failed to check bucket existence "${bucketName}": ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * 创建存储桶
   * @param bucketName 存储桶名称
   * @param region 区域
   */
  async makeBucket(bucketName: string, region?: string): Promise<void> {
    try {
      const exists = await this.bucketExists(bucketName);
      if (exists) {
        this.logger.debug(`Bucket "${bucketName}" already exists`);
        return;
      }

      await this.getClient().makeBucket(bucketName, region ?? this.options?.region);
      this.logger.debug(`Bucket "${bucketName}" created successfully`);
    } catch (error) {
      this.logger.error(`Failed to create bucket "${bucketName}": ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * 删除存储桶
   * @param bucketName 存储桶名称
   */
  async removeBucket(bucketName: string): Promise<void> {
    try {
      await this.getClient().removeBucket(bucketName);
      this.logger.log(`Bucket "${bucketName}" removed successfully`);
    } catch (error) {
      this.logger.error(`Failed to remove bucket "${bucketName}": ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * 列出所有存储桶
   */
  async listBuckets(): Promise<BucketItemFromList[]> {
    try {
      return await this.getClient().listBuckets();
    } catch (error) {
      this.logger.error(`Failed to list buckets: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * 上传文件
   * @param objectName 对象名称（文件路径）
   * @param filePath 本地文件路径或 Buffer
   * @param options 上传选项
   */
  async upload(objectName: string, filePath: string | Buffer, options?: UploadOptions): Promise<string> {
    try {
      const bucket = options?.bucket ?? this.defaultBucket;
      if (!bucket) {
        throw new Error('Bucket name is required');
      }

      // 确保存储桶存在
      await this.makeBucket(bucket);

      const metaData: Record<string, string> = options?.metadata ?? {};
      if (options?.contentType) {
        metaData['Content-Type'] = options.contentType;
      }

      await this.getClient().putObject(bucket, objectName, filePath, undefined, metaData);

      this.logger.log(`File uploaded successfully: ${bucket}/${objectName}`);
      return `${bucket}/${objectName}`;
    } catch (error) {
      this.logger.error(`Failed to upload file "${objectName}": ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * 上传文件流
   * @param objectName 对象名称（文件路径）
   * @param stream 文件流
   * @param options 上传选项
   */
  async uploadStream(objectName: string, stream: Readable, options?: UploadOptions): Promise<string> {
    try {
      const bucket = options?.bucket ?? this.defaultBucket;
      if (!bucket) {
        throw new Error('Bucket name is required');
      }

      // 确保存储桶存在
      await this.makeBucket(bucket);

      const metaData: Record<string, string> = options?.metadata ?? {};
      if (options?.contentType) {
        metaData['Content-Type'] = options.contentType;
      }

      await this.getClient().putObject(bucket, objectName, stream, undefined, metaData);

      this.logger.log(`File stream uploaded successfully: ${bucket}/${objectName}`);
      return `${bucket}/${objectName}`;
    } catch (error) {
      this.logger.error(`Failed to upload file stream "${objectName}": ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * 下载文件
   * @param objectName 对象名称（文件路径）
   * @param options 下载选项
   */
  async download(objectName: string, options?: DownloadOptions): Promise<Buffer> {
    try {
      const bucket = options?.bucket ?? this.defaultBucket;
      if (!bucket) {
        throw new Error('Bucket name is required');
      }

      const dataStream = await this.getClient().getObject(bucket, objectName);
      const chunks: Buffer[] = [];

      return new Promise((resolve, reject) => {
        dataStream.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });

        dataStream.on('end', () => {
          const buffer = Buffer.concat(chunks);
          this.logger.log(`File downloaded successfully: ${bucket}/${objectName}`);
          resolve(buffer);
        });

        dataStream.on('error', (error: Error) => {
          this.logger.error(`Failed to download file "${objectName}": ${error.message}`);
          reject(error);
        });
      });
    } catch (error) {
      this.logger.error(`Failed to download file "${objectName}": ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * 下载文件流
   * @param objectName 对象名称（文件路径）
   * @param options 下载选项
   */
  async downloadStream(objectName: string, options?: DownloadOptions): Promise<Readable> {
    try {
      const bucket = options?.bucket ?? this.defaultBucket;
      if (!bucket) {
        throw new Error('Bucket name is required');
      }

      const dataStream = await this.getClient().getObject(bucket, objectName);
      this.logger.log(`File stream downloaded: ${bucket}/${objectName}`);
      return dataStream;
    } catch (error) {
      this.logger.error(`Failed to download file stream "${objectName}": ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * 删除文件
   * @param objectName 对象名称（文件路径）
   * @param options 删除选项
   */
  async remove(objectName: string, options?: DownloadOptions): Promise<void> {
    try {
      const bucket = options?.bucket ?? this.defaultBucket;
      if (!bucket) {
        throw new Error('Bucket name is required');
      }

      await this.getClient().removeObject(bucket, objectName);
      this.logger.log(`File removed successfully: ${bucket}/${objectName}`);
    } catch (error) {
      this.logger.error(`Failed to remove file "${objectName}": ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * 批量删除文件
   * @param objectNames 对象名称数组
   * @param options 删除选项
   */
  async removeObjects(objectNames: string[], options?: DownloadOptions): Promise<void> {
    try {
      const bucket = options?.bucket ?? this.defaultBucket;
      if (!bucket) {
        throw new Error('Bucket name is required');
      }

      await this.getClient().removeObjects(bucket, objectNames);
      this.logger.log(`Files removed successfully: ${objectNames.length} objects`);
    } catch (error) {
      this.logger.error(`Failed to remove files: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * 获取文件信息
   * @param objectName 对象名称（文件路径）
   * @param options 选项
   */
  async statObject(objectName: string, options?: DownloadOptions): Promise<BucketItemStat> {
    try {
      const bucket = options?.bucket ?? this.defaultBucket;
      if (!bucket) {
        throw new Error('Bucket name is required');
      }

      return await this.getClient().statObject(bucket, objectName);
    } catch (error) {
      this.logger.error(`Failed to stat object "${objectName}": ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * 获取预签名 URL
   * @param objectName 对象名称（文件路径）
   * @param options 预签名 URL 选项
   */
  async presignedGetObject(objectName: string, options?: PresignedUrlOptions): Promise<string> {
    try {
      const bucket = options?.bucket ?? this.defaultBucket;
      if (!bucket) {
        throw new Error('Bucket name is required');
      }

      const expires = options?.expires ?? 7 * 24 * 60 * 60; // 默认 7 天
      const url = await this.getClient().presignedGetObject(bucket, objectName, expires);
      return url;
    } catch (error) {
      this.logger.error(`Failed to generate presigned URL for "${objectName}": ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * 获取预签名上传 URL
   * @param objectName 对象名称（文件路径）
   * @param options 预签名 URL 选项
   */
  async presignedPutObject(objectName: string, options?: PresignedUrlOptions): Promise<string> {
    try {
      const bucket = options?.bucket ?? this.defaultBucket;
      if (!bucket) {
        throw new Error('Bucket name is required');
      }

      const expires = options?.expires ?? 7 * 24 * 60 * 60; // 默认 7 天
      const url = await this.getClient().presignedPutObject(bucket, objectName, expires);
      return url;
    } catch (error) {
      this.logger.error(`Failed to generate presigned PUT URL for "${objectName}": ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * 列出对象
   * @param options 列出选项
   */
  async listObjects(options?: ListObjectsOptions): Promise<BucketItemFromList[]> {
    try {
      const bucket = options?.bucket ?? this.defaultBucket;
      if (!bucket) {
        throw new Error('Bucket name is required');
      }

      const objects: BucketItemFromList[] = [];
      const stream = this.getClient().listObjects(bucket, options?.prefix, options?.recursive);

      return new Promise((resolve, reject) => {
        stream.on('data', (obj: BucketItemFromList) => {
          objects.push(obj);
          if (options?.maxKeys && objects.length >= options.maxKeys) {
            stream.destroy();
            resolve(objects);
          }
        });

        stream.on('end', () => {
          resolve(objects);
        });

        stream.on('error', (error: Error) => {
          this.logger.error(`Failed to list objects: ${error.message}`);
          reject(error);
        });
      });
    } catch (error) {
      this.logger.error(`Failed to list objects: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * 复制对象
   * @param sourceObjectName 源对象名称
   * @param destObjectName 目标对象名称
   * @param sourceBucket 源存储桶
   * @param destBucket 目标存储桶
   */
  async copyObject(sourceObjectName: string, destObjectName: string, sourceBucket?: string, destBucket?: string): Promise<void> {
    try {
      const srcBucket = sourceBucket ?? this.defaultBucket;
      const dstBucket = destBucket ?? this.defaultBucket;

      if (!srcBucket || !dstBucket) {
        throw new Error('Bucket name is required');
      }

      const copyConditions = new (Minio as { CopyConditions: new () => Minio.CopyConditions }).CopyConditions();
      await this.getClient().copyObject(dstBucket, destObjectName, `/${srcBucket}/${sourceObjectName}`, copyConditions);

      this.logger.log(`Object copied successfully: ${srcBucket}/${sourceObjectName} -> ${dstBucket}/${destObjectName}`);
    } catch (error) {
      this.logger.error(`Failed to copy object: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * 设置存储桶策略（公开访问）
   * @param bucketName 存储桶名称
   */
  async setBucketPolicyPublic(bucketName: string): Promise<void> {
    try {
      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${bucketName}/*`],
          },
        ],
      } as const;

      await this.getClient().setBucketPolicy(bucketName, JSON.stringify(policy));
      this.logger.log(`Bucket policy set to public for "${bucketName}"`);
    } catch (error) {
      this.logger.error(`Failed to set bucket policy: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
}
