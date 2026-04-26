
import { Request } from 'express';

export interface AbnormalResponseBody {
  statusCode: number;
  message: string | string[];
  timestamp: string;
  path: string;
  method: string;
  requestId?: string;
}

interface BuildAbnormalResponseOptions {
  statusCode: number;
  message: string | string[];
  request: Request;
}

export function buildAbnormalResponse(options: BuildAbnormalResponseOptions): AbnormalResponseBody {
  return {
    statusCode: options.statusCode,
    message: options.message,
    timestamp: new Date().toISOString(),
    path: options.request.originalUrl,
    method: options.request.method,
    requestId: options.request.requestId,
  };
}
