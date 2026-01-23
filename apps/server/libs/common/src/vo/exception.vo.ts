export class ExceptionVo {
  constructor(
    public readonly message: string,
    public readonly statusCode: number,
    public readonly path: string,
    public readonly method: string,
  ) {}

  static build(values: { message: string; statusCode: number; timestamp: string; path: string; method: string }) {
    return {
      message: values.message,
      statusCode: values.statusCode,
      timestamp: values.timestamp,
      path: values.path,
      method: values.method,
    };
  }
}

export const ExceptionVoSchema = {
  type: 'object',
  properties: {
    message: { type: 'string', example: 'error' },
    statusCode: { type: 'number', example: 500 },
    timestamp: { type: 'string', example: new Date().toISOString() },
    path: { type: 'string', example: '/' },
    method: { type: 'string', example: 'GET' },
  },
};
