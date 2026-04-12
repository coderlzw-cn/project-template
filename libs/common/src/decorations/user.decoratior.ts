import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

/**
 * 当前用户装饰器
 * @param data 数据
 * @param ctx 执行上下文
 * @returns 当前用户
 * @example
 * @CurrentUser()
 * @CurrentUser('user.id')
 */
export const User = createParamDecorator((data: keyof Express.Request['user'], ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<Request>();
  const user = request.user;
  return data ? user?.[data] : user;
});
