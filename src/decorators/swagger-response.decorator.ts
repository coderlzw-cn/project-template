// import { applyDecorators, Type } from '@nestjs/common';
// import { ApiExtraModels, ApiOkResponse, ApiResponse, ApiResponseOptions, getSchemaPath } from '@nestjs/swagger';
// import { ApiResponse as EnvelopeResponse } from '../interceptors/transform.interceptor';

// export interface ApiEnvelopeOptions extends Omit<ApiResponseOptions, 'schema'> {
//   /** 是否为数组响应 */
//   isArray?: boolean;
//   /** 成功响应中的 data 对应的 DTO 类型 */
//   type?: Type<unknown>;
//   /** data 的示例值 */
//   exampleData?: unknown;
//   /** message 的示例值 */
//   exampleMessage?: string;
//   /** code 的示例值 */
//   exampleCode?: number;
// }

// export interface ApiErrorEnvelopeOptions extends Omit<ApiResponseOptions, 'schema'> {
//   /** 异常 message 示例 */
//   exampleMessage?: string | string[];
//   /** statusCode 示例 */
//   exampleStatusCode?: number;
// }

// function buildSuccessSchema(options: ApiEnvelopeOptions) {
//   const dataSchema = options.type
//     ? options.isArray
//       ? {
//           type: 'array',
//           items: { $ref: getSchemaPath(options.type) },
//         }
//       : {
//           $ref: getSchemaPath(options.type),
//         }
//     : options.isArray
//       ? { type: 'array', items: {} }
//       : {};

//   return {
//     allOf: [
//       {
//         type: 'object',
//         properties: {
//           code: {
//             type: 'number',
//             example: options.exampleCode ?? 200,
//           },
//           message: {
//             type: 'string',
//             example: options.exampleMessage ?? '请求成功',
//           },
//           data: options.type || options.isArray ? dataSchema : { nullable: true },
//         },
//       },
//     ],
//     example:
//       options.type || options.isArray
//         ? {
//             code: options.exampleCode ?? 200,
//             message: options.exampleMessage ?? '请求成功',
//             data: options.exampleData ?? null,
//           }
//         : {
//             code: options.exampleCode ?? 200,
//             message: options.exampleMessage ?? '请求成功',
//             data: options.exampleData ?? null,
//           },
//   };
// }

// /**
//  * 统一成功响应 Swagger 装饰器。
//  * 作用：
//  * - 与 `TransformInterceptor` 的 `{ code, message, data }` 外壳保持一致。
//  * - 支持普通对象、数组对象和空响应三种场景。
//  * - 适合直接贴到 controller 方法上，减少每个接口重复写响应 schema。
//  *
//  * @example
//  * @ApiSuccessResponse(UserDto)
//  * @example
//  * @ApiSuccessResponse(UserDto, { isArray: true })
//  * @example
//  * @ApiSuccessResponse()
//  */
// export function ApiSuccessResponse<T extends Type<unknown> | undefined = undefined>(typeOrOptions?: T | ApiEnvelopeOptions, maybeOptions: ApiEnvelopeOptions = {}) {
//   const options = typeof typeOrOptions === 'function' ? maybeOptions : (typeOrOptions ?? {});
//   const type = typeof typeOrOptions === 'function' ? typeOrOptions : undefined;

//   return applyDecorators(
//     ...(type ? [ApiExtraModels(type)] : []),
//     ApiOkResponse({
//       ...options,
//       schema: buildSuccessSchema({ ...options, type }),
//     }),
//   );
// }

// function buildErrorSchema() {
//   return {
//     type: 'object',
//     properties: {
//       message: {
//         oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
//         example: '请求失败',
//       },
//       statusCode: {
//         type: 'number',
//         example: 500,
//       },
//       timestamp: {
//         type: 'string',
//         example: new Date().toISOString(),
//       },
//       path: {
//         type: 'string',
//         example: '/api/users',
//       },
//       method: {
//         type: 'string',
//         example: 'GET',
//       },
//       requestId: {
//         type: 'string',
//         example: '550e8400-e29b-41d4-a716-446655440000',
//       },
//       error: {
//         type: 'string',
//         example: 'InternalServerError',
//       },
//     },
//   };
// }

// /**
//  * 统一异常响应 Swagger 装饰器。
//  * 作用：
//  * - 与 `CatchEverythingFilter` 输出结构一致。
//  * - 保留 `message: string | string[]`，兼容校验错误。
//  *
//  * @example
//  * @ApiErrorResponse()
//  */
// export function ApiErrorResponse(options: ApiErrorEnvelopeOptions = {}) {
//   return applyDecorators(
//     ApiResponse({
//       ...options,
//       status: options.status ?? 500,
//       schema: buildErrorSchema(),
//     }),
//   );
// }

// /**
//  * 分页响应 Swagger 装饰器。
//  * 作用：
//  * - 与 `PaginationInterceptor` 输出的平级字段对齐。
//  * - 让分页接口在 Swagger 上看到完整的列表和分页元信息。
//  *
//  * @example
//  * @ApiPaginatedResponse(UserDto)
//  */
// export function ApiPaginatedResponse<T extends Type<unknown>>(type: T, options: Omit<ApiEnvelopeOptions, 'type'> = {}) {
//   return applyDecorators(
//     ApiExtraModels(type),
//     ApiOkResponse({
//       ...options,
//       schema: {
//         allOf: [
//           {
//             type: 'object',
//             properties: {
//               code: { type: 'number', example: options.exampleCode ?? 200 },
//               message: { type: 'string', example: options.exampleMessage ?? '请求成功' },
//               data: {
//                 type: 'object',
//                 properties: {
//                   list: {
//                     type: 'array',
//                     items: { $ref: getSchemaPath(type) },
//                   },
//                   page: { type: 'number', example: 1 },
//                   pageSize: { type: 'number', example: 10 },
//                   total: { type: 'number', example: 100 },
//                   pages: { type: 'number', example: 10 },
//                 },
//               },
//             },
//           },
//         ],
//       },
//     }),
//   );
// }

// export type ApiSuccessResponseBody<T> = EnvelopeResponse<T>;
// export type ApiExceptionResponseBody = ExceptionResponseBody;
// export type ApiPaginationResponseBody<T> = {
//   code: number;
//   message: string;
//   data: {
//     list: T[];
//     page: number;
//     pageSize: number;
//     total: number;
//     pages: number;
//   };
// };
