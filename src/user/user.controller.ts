import {
  Controller,
  Get,
  Post,
  Patch,
  UseGuards,
  Body,
  Param,
  Delete,
} from '@nestjs/common';
import { GetAuthUserAccount } from 'src/auth/decorator';
import { JwtGuard } from 'src/auth/guard';
import { GetPagination } from 'src/pagination/decorator';
import { PaginationDto } from 'src/pagination/dto';
import { UserWithAccount } from 'src/types';

import { UserDto } from './dto';
import { UserService } from './user.service';

@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  @UseGuards(JwtGuard)
  @Get('me')
  getMe(@GetAuthUserAccount() authAccount: UserWithAccount) {
    return authAccount;
  }

  @Post('')
  create(@Body() data: UserDto) {
    return this.userService.create(data);
  }

  @Get('')
  getUsers(@GetPagination() paginationOptions: PaginationDto) {
    return this.userService.readAll(paginationOptions);
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
