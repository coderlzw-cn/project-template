import { SetMetadata } from '@nestjs/common';

export const FILE_RESPONSE_METADATA_KEY = 'fileResponseOptions';

export interface FileResponseOptions {
  /** 下载文件名 */
  filename?: string;
  /** 响应 MIME 类型 */
  contentType?: string;
  /** inline 用于浏览器预览，attachment 用于下载 */
  disposition?: 'attachment' | 'inline';
}

/**
 * 统一设置文件响应头。
 * 适合 Buffer、StreamableFile、文件导出等接口。
 *
 * @example
 * @FileResponse({ filename: 'report.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
 * exportReport() {
 *   return this.service.exportReport();
 * }
 */
export const FileResponse = (options: FileResponseOptions = {}) => SetMetadata(FILE_RESPONSE_METADATA_KEY, options);
