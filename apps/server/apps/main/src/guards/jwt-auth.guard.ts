import { IS_PUBLIC_KEY } from '@app/common/decorations/public.decorator';
import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // 读取元数据：检查当前方法或类是否标记了 @Public()
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()]);

    if (isPublic) {
      return true; // 如果是公开接口，直接放行，不走 Passport 校验
    }

    return super.canActivate(context); // 否则，调用父类逻辑执行 JWT 校验
  }
}
