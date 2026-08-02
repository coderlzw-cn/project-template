import { Public } from '@/decorators/public.decorator';
import { Controller, Get } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { UserService } from './user.service';

@Public()
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @ApiOperation({ summary: 'user测试' })
  @Get('list')
  users() {
    return this.userService.finAll();
  }
}
