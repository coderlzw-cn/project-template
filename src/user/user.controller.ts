import { Controller, Get, Req } from '@nestjs/common';
import { UserService } from './user.service';
import { ApiOperation } from '@nestjs/swagger';
import { type Request } from 'express';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @ApiOperation({ summary: 'user测试' })
  @Get()
  users(@Req() req: Request) {
    console.log(req.clientIp);

    return ['11111'];
  }
}
