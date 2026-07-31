import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { authJwtConfig } from './jwt.config';
import { User } from '@/generated/prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    @Inject(authJwtConfig.KEY)
    private readonly config: ConfigType<typeof authJwtConfig>,
  ) {}

  async validateUser(username: string, password: string) {
    void password;
    return Promise.resolve({ id: '1', username, password: '@password', createAt: 111 });
  }

  async login(user: User) {
    console.log(user);

    console.log({
      accessToken: await this.jwtService.signAsync({
        sub: user.id,
        username: user.username,
      }),
      expiresIn: this.config.accessTtlSeconds,
    });

    return {
      accessToken: await this.jwtService.signAsync({
        sub: user.id,
        username: user.username,
      }),
      expiresIn: this.config.accessTtlSeconds,
    };
  }
}
