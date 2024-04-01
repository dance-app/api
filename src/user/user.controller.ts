import { Controller, Get, Post, UseGuards, Body } from '@nestjs/common';
import { Account } from '@prisma/client';
import { GetUserAccount } from 'src/user/decorator';

import { UserDto } from './dto';
import { UserService } from './user.service';
import { JwtGuard } from '../auth/guard';

@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  @UseGuards(JwtGuard)
  @Get('me')
  getMe(@GetUserAccount() account: Omit<Account, 'password'>) {
    return account;
  }

  @Get('')
  getUsers() {
    return this.userService.readAll();
  }

  @Post('')
  create(@Body() userDto: UserDto) {
    return this.userService.create(userDto);
  }
}
