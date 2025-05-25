import {
  Controller,
  Get,
  UseGuards,
  Param,
  Delete,
  ForbiddenException,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';

import { UserService } from './user.service';
import { UserWithAccount } from './user.types';

import { GetAuthUser } from '@/auth/decorator';
import { JwtGuard } from '@/auth/guard';
import { SuperAdminGuard } from '@/auth/guard/super-admin.guard';
import { GetPagination } from '@/pagination/decorator';
import { PaginationDto } from '@/pagination/dto';

@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  @Get('me')
  getMe(@GetAuthUser() user: UserWithAccount) {
    return user;
  }

  @Get('')
  @UseGuards(SuperAdminGuard)
  getUsers(@GetPagination() paginationOptions: PaginationDto) {
    return this.userService.readAll(paginationOptions);
  }

  @Get(':id')
  async getUser(
    @GetAuthUser() user: UserWithAccount,
    @Param('id') id: number,
  ): Promise<UserWithAccount> {
    if (user.id !== id && !user.isSuperAdmin) throw new ForbiddenException();
    // TODO: what other users can see about other users?
    return await this.userService.findById(id, true);
  }

  // @Patch(':id')
  // updateUser(@Param('id') id: string, @Body() data: UserDto) {
  //   return this.userService.update(Number(id), data);
  // }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.userService.delete(Number(id));
  }
}
