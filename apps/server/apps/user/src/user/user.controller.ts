import { Body, Controller, Get, Post } from '@nestjs/common';
import { UserService } from './user.service';
import { CurrentUser } from '@app/common/decorators/auth-user.decorator';
import { type User } from '../generated/prisma/browser';
import { CreateUserDto } from './dto/create-user.dto';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  getMe(@CurrentUser() user: User) {
    console.log(user.name ?? '');
    return 'ok';
  }

  @Post()
  createUser(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Get()
  getUsers() {
    return this.userService.findAll();
  }
}
