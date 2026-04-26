import { SetMetadata } from '@nestjs/common';

export const PAGINATION_RESPONSE_METADATA_KEY = 'paginationResponseEnabled';

/**
 * 将常见分页结果统一成 `{ list, pagination }`。
 * 支持 `{ list, total, page, pageSize }`、`{ items, total, page, pageSize }` 和 `[list, total]`。
 *
 * @example
 * @PaginationResponse()
 * async findPage() {
 *   return { list, total, page, pageSize };
 * }
 */
export const PaginationResponse = () => SetMetadata(PAGINATION_RESPONSE_METADATA_KEY, true);
