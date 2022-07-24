import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';

import { STRATEGY_NAME } from '../auth/strategy';

@Controller('users')
export class UserController {
  @UseGuards(AuthGuard(STRATEGY_NAME))
  @Get('me')
  getMe(@Req() req: Request) {
    return req.user;
  }
}
