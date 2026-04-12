import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { User } from '../../../generated/prisma/client';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super();
  }

  // 登录时，先调用此方法验证用户名和密码，验证通过后，会自动调用 JwtStrategy 的 validate 方法
  validate(username: string, password: string): Promise<User> {
    return this.authService.validateUser(username, password);
  }
}
