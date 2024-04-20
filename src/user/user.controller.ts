import {
  Controller,
  Get,
  Post,
  Patch,
  UseGuards,
  Body,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { Account } from '@prisma/client';
import { DEFAULT_PAGE_SIZE } from 'src/constants';
import { GetUserAccount } from 'src/user/decorator';

import { UserDto, PaginationDto } from './dto';
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

  @Post('')
  create(@Body() data: UserDto) {
    return this.userService.create(data);
  }

  @Get('')
  getUsers(@Query() pagination) {
    console.log('pagination', pagination);
    const formattedPagination: PaginationDto = {
      limit: Number(pagination.limit ?? DEFAULT_PAGE_SIZE.limit),
      offset: Number(pagination.offset ?? DEFAULT_PAGE_SIZE.offset),
    };
    return this.userService.readAll(formattedPagination);
  }

  @Get(':id')
  getUser(@Param('id') id: string) {
    return this.userService.readById({ id: Number(id) });
  }

  @Patch(':id')
  updateUser(@Param('id') id: string, @Body() data: UserDto) {
    return this.userService.update(Number(id), data);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.userService.delete(Number(id));
  }
}
