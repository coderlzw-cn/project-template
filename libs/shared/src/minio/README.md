# MinIO 模块

基于 `minio` 封装的对象存储模块，兼容 Amazon S3 API。

## 功能特性

- ✅ 基于 `minio` SDK
- ✅ 使用 ConfigurableModuleBuilder 构建
- ✅ 支持全局模块
- ✅ 完整的对象存储操作封装
  - 存储桶管理（创建、删除、列出、检查）
  - 文件上传（文件路径、Buffer、流）
  - 文件下载（Buffer、流）
  - 文件删除（单个、批量）
  - 文件复制
  - 获取文件信息
  - 预签名 URL（GET、PUT）
  - 列出对象
  - 存储桶策略设置

## 安装

确保已安装以下依赖：

```bash
pnpm add minio
```

## 使用方法

### 1. 在 AppModule 中导入

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MinioModule } from '@app/shared/minio';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // 方式一：使用 forRoot（同步配置）
    MinioModule.forRoot({
      endPoint: '127.0.0.1',
      port: 9000,
      useSSL: false,
      accessKey: 'minioadmin',
      secretKey: 'minioadmin',
      defaultBucket: 'my-bucket',
      region: 'us-east-1',
    }),
    // 方式二：使用 forRootAsync（推荐，从配置读取）
    MinioModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        endPoint: configService.get('MINIO_ENDPOINT', '127.0.0.1'),
        port: configService.get('MINIO_PORT', 9000),
        useSSL: configService.get('MINIO_USE_SSL', false),
        accessKey: configService.get('MINIO_ACCESS_KEY', 'minioadmin'),
        secretKey: configService.get('MINIO_SECRET_KEY', 'minioadmin'),
        defaultBucket: configService.get('MINIO_DEFAULT_BUCKET', 'my-bucket'),
        region: configService.get('MINIO_REGION', 'us-east-1'),
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

### 2. 在服务中使用 MinioService

```typescript
import { Injectable } from '@nestjs/common';
import { MinioService } from '@app/shared/minio';
import { createReadStream } from 'fs';
import { join } from 'path';

@Injectable()
export class FileService {
  constructor(private readonly minioService: MinioService) {}

  // 上传文件（使用文件路径）
  async uploadFile(filePath: string, objectName: string) {
    const result = await this.minioService.upload(objectName, filePath, {
      contentType: 'image/jpeg',
      metadata: {
        'x-custom-metadata': 'value',
      },
    });
    return result; // 返回: bucket/objectName
  }

  // 上传文件（使用 Buffer）
  async uploadBuffer(buffer: Buffer, objectName: string) {
    const result = await this.minioService.upload(objectName, buffer, {
      bucket: 'my-bucket',
      contentType: 'application/pdf',
    });
    return result;
  }

  // 上传文件流
  async uploadStream(objectName: string, stream: NodeJS.ReadableStream) {
    const result = await this.minioService.uploadStream(objectName, stream, {
      contentType: 'video/mp4',
    });
    return result;
  }

  // 下载文件（返回 Buffer）
  async downloadFile(objectName: string): Promise<Buffer> {
    return await this.minioService.download(objectName);
  }

  // 下载文件（返回流）
  async downloadFileStream(objectName: string) {
    return await this.minioService.downloadStream(objectName);
  }

  // 删除文件
  async deleteFile(objectName: string) {
    await this.minioService.remove(objectName);
  }

  // 批量删除文件
  async deleteFiles(objectNames: string[]) {
    await this.minioService.removeObjects(objectNames);
  }

  // 获取文件信息
  async getFileInfo(objectName: string) {
    const stat = await this.minioService.statObject(objectName);
    return {
      size: stat.size,
      etag: stat.etag,
      lastModified: stat.lastModified,
      contentType: stat.metaData['content-type'],
    };
  }

  // 获取预签名下载 URL（有效期 7 天）
  async getPresignedUrl(objectName: string): Promise<string> {
    return await this.minioService.presignedGetObject(objectName, {
      expires: 7 * 24 * 60 * 60, // 7 天
    });
  }

  // 获取预签名上传 URL
  async getPresignedUploadUrl(objectName: string): Promise<string> {
    return await this.minioService.presignedPutObject(objectName, {
      expires: 24 * 60 * 60, // 1 天
    });
  }

  // 列出所有文件
  async listFiles(prefix?: string) {
    return await this.minioService.listObjects({
      prefix,
      recursive: true,
      maxKeys: 100,
    });
  }

  // 复制文件
  async copyFile(sourceObjectName: string, destObjectName: string) {
    await this.minioService.copyObject(sourceObjectName, destObjectName);
  }
}
```

### 3. 在控制器中使用（文件上传）

```typescript
import { Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MinioService } from '@app/shared/minio';

@Controller('files')
export class FileController {
  constructor(private readonly minioService: MinioService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    const objectName = `uploads/${Date.now()}-${file.originalname}`;
    const result = await this.minioService.upload(objectName, file.buffer, {
      contentType: file.mimetype,
      metadata: {
        'original-name': file.originalname,
      },
    });

    // 获取预签名 URL
    const url = await this.minioService.presignedGetObject(objectName);

    return {
      objectName: result,
      url,
      size: file.size,
    };
  }
}
```

## 配置选项

### MinioModuleOptions

| 选项 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `endPoint` | `string` | 是 | MinIO 服务器地址 |
| `port` | `number` | 否 | MinIO 服务器端口（默认：9000） |
| `useSSL` | `boolean` | 否 | 是否使用 SSL（默认：false） |
| `accessKey` | `string` | 是 | 访问密钥 |
| `secretKey` | `string` | 是 | 秘密密钥 |
| `defaultBucket` | `string` | 否 | 默认存储桶 |
| `region` | `string` | 否 | 区域（默认：'us-east-1'） |
| `isGlobal` | `boolean` | 否 | 是否全局模块（默认：true） |
| `connectTimeout` | `number` | 否 | 连接超时时间（毫秒） |
| `requestTimeout` | `number` | 否 | 请求超时时间（毫秒） |

### UploadOptions

| 选项 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `bucket` | `string` | 否 | 存储桶名称（默认使用配置的 defaultBucket） |
| `contentType` | `string` | 否 | 内容类型（MIME 类型） |
| `metadata` | `Record<string, string>` | 否 | 元数据 |
| `isPublic` | `boolean` | 否 | 是否设置为公开访问（暂未实现） |

### DownloadOptions

| 选项 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `bucket` | `string` | 否 | 存储桶名称 |

### PresignedUrlOptions

| 选项 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `bucket` | `string` | 否 | 存储桶名称 |
| `expires` | `number` | 否 | URL 过期时间（秒，默认：7 天） |

### ListObjectsOptions

| 选项 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `bucket` | `string` | 否 | 存储桶名称 |
| `prefix` | `string` | 否 | 对象前缀（用于过滤） |
| `recursive` | `boolean` | 否 | 是否递归列出（默认：false） |
| `maxKeys` | `number` | 否 | 最大返回数量 |

## API 方法

### 存储桶管理

#### `bucketExists(bucketName: string): Promise<boolean>`

检查存储桶是否存在。

#### `makeBucket(bucketName: string, region?: string): Promise<void>`

创建存储桶（如果不存在）。

#### `removeBucket(bucketName: string): Promise<void>`

删除存储桶。

#### `listBuckets(): Promise<BucketItem[]>`

列出所有存储桶。

### 文件操作

#### `upload(objectName: string, filePath: string | Buffer, options?: UploadOptions): Promise<string>`

上传文件（支持文件路径或 Buffer）。

**返回：** `bucket/objectName`

#### `uploadStream(objectName: string, stream: NodeJS.ReadableStream, options?: UploadOptions): Promise<string>`

上传文件流。

#### `download(objectName: string, options?: DownloadOptions): Promise<Buffer>`

下载文件（返回 Buffer）。

#### `downloadStream(objectName: string, options?: DownloadOptions): Promise<IncomingMessage>`

下载文件流。

#### `remove(objectName: string, options?: DownloadOptions): Promise<void>`

删除文件。

#### `removeObjects(objectNames: string[], options?: DownloadOptions): Promise<void>`

批量删除文件。

#### `statObject(objectName: string, options?: DownloadOptions): Promise<BucketItemStat>`

获取文件信息（大小、ETag、最后修改时间等）。

#### `copyObject(sourceObjectName: string, destObjectName: string, sourceBucket?: string, destBucket?: string): Promise<void>`

复制文件。

### 预签名 URL

#### `presignedGetObject(objectName: string, options?: PresignedUrlOptions): Promise<string>`

获取预签名下载 URL。

#### `presignedPutObject(objectName: string, options?: PresignedUrlOptions): Promise<string>`

获取预签名上传 URL。

### 列表操作

#### `listObjects(options?: ListObjectsOptions): Promise<BucketItem[]>`

列出对象。

### 策略管理

#### `setBucketPolicyPublic(bucketName: string): Promise<void>`

设置存储桶策略为公开访问（允许所有人读取）。

### 高级操作

#### `getClient(): Minio.Client`

获取底层 MinIO 客户端实例（用于高级操作）。

## 注意事项

1. **默认存储桶**：如果配置了 `defaultBucket`，在操作文件时可以不指定存储桶名称
2. **存储桶自动创建**：使用 `upload` 或 `uploadStream` 时，如果存储桶不存在会自动创建
3. **预签名 URL**：预签名 URL 有过期时间，过期后无法使用
4. **文件大小限制**：默认没有大小限制，但建议在应用层面进行限制
5. **错误处理**：所有操作都有错误处理和日志记录
6. **连接管理**：MinIO 客户端不需要显式关闭连接
7. **SSL/TLS**：生产环境建议使用 SSL（设置 `useSSL: true`）

## 环境变量配置示例

```env
# MinIO 配置
MINIO_ENDPOINT=127.0.0.1
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_DEFAULT_BUCKET=my-bucket
MINIO_REGION=us-east-1
MINIO_CONNECT_TIMEOUT=10000
MINIO_REQUEST_TIMEOUT=30000
```

## 最佳实践

1. **使用配置服务**：推荐使用 `forRootAsync` 从环境变量读取配置
2. **设置默认存储桶**：在生产环境建议配置 `defaultBucket` 简化操作
3. **文件命名规范**：使用统一的文件命名规范，如 `uploads/2024/01/01/xxx.jpg`
4. **预签名 URL**：对于临时访问的文件，使用预签名 URL 而不是直接公开访问
5. **错误处理**：在实际使用中根据业务需求添加更详细的错误处理
6. **文件大小限制**：在控制器层添加文件大小限制
7. **存储桶策略**：根据业务需求设置合适的存储桶访问策略

## 示例：完整的文件上传服务

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { MinioService } from '@app/shared/minio';

@Injectable()
export class FileUploadService {
  private readonly logger = new Logger(FileUploadService.name);

  constructor(private readonly minioService: MinioService) {}

  async uploadImage(file: Express.Multer.File): Promise<{ url: string; objectName: string }> {
    // 生成对象名称
    const timestamp = Date.now();
    const extension = file.originalname.split('.').pop();
    const objectName = `images/${timestamp}.${extension}`;

    // 上传文件
    await this.minioService.upload(objectName, file.buffer, {
      contentType: file.mimetype,
      metadata: {
        'original-name': file.originalname,
        'upload-time': timestamp.toString(),
      },
    });

    // 获取预签名 URL（有效期 30 天）
    const url = await this.minioService.presignedGetObject(objectName, {
      expires: 30 * 24 * 60 * 60,
    });

    this.logger.log(`Image uploaded: ${objectName}`);

    return {
      objectName,
      url,
    };
  }

  async deleteImage(objectName: string): Promise<void> {
    await this.minioService.remove(objectName);
    this.logger.log(`Image deleted: ${objectName}`);
  }

  async getImageInfo(objectName: string) {
    const stat = await this.minioService.statObject(objectName);
    return {
      size: stat.size,
      contentType: stat.metaData['content-type'],
      lastModified: stat.lastModified,
      etag: stat.etag,
    };
  }
}
```
