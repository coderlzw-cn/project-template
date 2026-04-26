import { Request, Response } from 'express';

/**
 * raw body 保存器。
 * 功能：
 * - 配合 express `json/urlencoded` 的 `verify` 选项保存原始请求体。
 * - 用于支付回调、Webhook 等需要基于原始 body 做签名校验的场景。
 * - 不会改变解析后的 `req.body`。
 *
 * @example
 * app.use(json({ verify: RawBodyMiddleware }));
 */
export function RawBodyMiddleware(req: Request, _res: Response, buffer: Buffer) {
  if (buffer.length > 0) {
    req.rawBody = Buffer.from(buffer);
  }
}
