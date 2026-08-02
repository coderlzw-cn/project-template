import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

/**
 * 当前用户装饰器
 * @param data 数据
 * @param ctx 执行上下文
 * @returns 当前用户
 * @example
 * @User()
 * @User('id')
 */
export const AuthUser = createParamDecorator((data: keyof AuthUserPayload | undefined, ctx: ExecutionContext) => {
  const user = ctx.switchToHttp().getRequest<Request>().authInfo;
  return data ? user?.[data] : user;
});
