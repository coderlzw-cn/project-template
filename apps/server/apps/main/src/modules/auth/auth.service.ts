import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { type ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { jwtConfig } from '../../config/app.config';
import { User } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService,
    @Inject(jwtConfig.KEY)
    private readonly jwtConfiguration: ConfigType<typeof jwtConfig>,
  ) {}
  async validateUser(username: string, password: string) {
    const user = await this.prismaService.user.findFirst({
      where: {
        username: username,
        password: password,
      },
    });
    if (!user) {
      throw new BadRequestException('用户名或密码错误');
    }
    return user;
  }
  login(loginDto: LoginDto, user: User) {
    const accessToken = this.jwtService.sign({ id: user.id });
    const refreshToken = this.jwtService.sign({ id: user.id }, { expiresIn: this.jwtConfiguration.refreshExpiresIn });
    return {
      accessToken,
      refreshToken,
    };
  }
}
