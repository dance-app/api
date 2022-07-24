import { Controller, Get, UseGuards } from '@nestjs/common';
import { Account } from '@prisma/client';
import { GetUserAccount } from 'src/auth/decorator';

import { JwtGuard } from '../auth/guard';

@Controller('users')
export class UserController {
  @UseGuards(JwtGuard)
  @Get('me')
  getMe(@GetUserAccount() account: Omit<Account, 'password'>) {
    return account;
  }
}
