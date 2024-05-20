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
import { GetAuthUser } from 'src/auth/decorator';
import { JwtGuard } from 'src/auth/guard';
import { GetPagination } from 'src/pagination/decorator';
import { PaginationDto } from 'src/pagination/dto';
import { Roles } from 'src/role/decorator/roles.decorator';
import { RolesGuard } from 'src/role/guard/roles.guard';

import { UserDto } from './dto';
import { UserService } from './user.service';
import { UserWithAccount } from './user.types';

@UseGuards(JwtGuard, RolesGuard)
@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  @UseGuards(JwtGuard)
  @Get('me')
  getMe(@GetAuthUser() user: UserWithAccount) {
    return user;
  }

  @Post('')
  @Roles([], true)
  create(@Body() data: UserDto) {
    return this.userService.create(data);
  }

  @Get('')
  @Roles([], true)
  // @UseGuards(RolesGuard)
  getUsers(@GetPagination() paginationOptions: PaginationDto) {
    console.log('ok');
    return [];
    // return this.userService.readAll(paginationOptions);
  }

  @Get(':id')
  @Roles([], true)
  getUser(@Param('id') id: string) {
    return this.userService.readById({ id: Number(id) });
  }

  @Patch(':id')
  @Roles([], true)
  updateUser(@Param('id') id: string, @Body() data: UserDto) {
    return this.userService.update(Number(id), data);
  }

  @Patch(':id/link-workspace')
  @Roles([], true)
  linkWorkspace(
    @Param('id') id: string,
    @Body() data: { workspaceId: number },
  ) {
    return this.userService.linkWorkspace(Number(id), data.workspaceId);
  }

  @Delete(':id')
  @Roles([], true)
  delete(@Param('id') id: string) {
    return this.userService.delete(Number(id));
  }
}
