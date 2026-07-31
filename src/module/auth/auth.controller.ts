import { SkipLicense } from '@/license/skip-license.decorator';
import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../decorators/public.decorator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { LocalAuthGuard } from './guard/local-auth.guard';
import { type Request } from 'express';
import { AuthUser } from '@/decorators/auth-user.decoratior';

@SkipLicense()
@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @ApiOperation({ summary: '用户名密码登录并签发访问令牌' })
  login(@Body() credentials: LoginDto, @Req() request: Request) {
    void credentials;
    return this.authService.login(request.user!);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: '认证用户信息' })
  @Get('profile')
  profile(@AuthUser() authUser: AuthUserPayload) {
    return authUser;
  }
}
