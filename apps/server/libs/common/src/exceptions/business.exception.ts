import { HttpException, HttpStatus } from '@nestjs/common';

export class BusinessException extends HttpException {
  constructor(message: string, errorCode: number = 10001) {
    // 业务异常通常返回 200 或 400，取决于你的 API 设计规范
    // 这里建议返回 200 OK 但在 body 中区分 code，或者返回 400 Bad Request
    super(
      {
        success: false,
        message,
        code: errorCode, // 自定义业务错误码
        data: null,
      },
      HttpStatus.BAD_REQUEST, // 默认 HTTP 状态码
    );
  }
}
