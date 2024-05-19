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
import { GetAuthUserAccount, GetAllowedRoles } from 'src/auth/decorator';
import { JwtGuard, RolesGuard } from 'src/auth/guard';
import { GetPagination } from 'src/pagination/decorator';
import { PaginationDto } from 'src/pagination/dto';
import { UserWithAccount } from 'src/types';

import { UserDto } from './dto';
import { UserService } from './user.service';

@UseGuards(JwtGuard, RolesGuard)
@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  @UseGuards(JwtGuard)
  @Get('me')
  getMe(@GetAuthUserAccount() authAccount: UserWithAccount) {
    return authAccount;
  }

  @Post('')
  @GetAllowedRoles([], true)
  create(@Body() data: UserDto) {
    return this.userService.create(data);
  }

  @Get('')
  @GetAllowedRoles([], true)
  getUsers(@GetPagination() paginationOptions: PaginationDto) {
    return this.userService.readAll(paginationOptions);
  }

  @Get(':id')
  @GetAllowedRoles([], true)
  getUser(@Param('id') id: string) {
    return this.userService.readById({ id: Number(id) });
  }

  @Patch(':id')
  @GetAllowedRoles([], true)
  updateUser(@Param('id') id: string, @Body() data: UserDto) {
    return this.userService.update(Number(id), data);
  }

  @Patch(':id/link-workspace')
  @GetAllowedRoles([], true)
  linkWorkspace(
    @Param('id') id: string,
    @Body() data: { workspaceId: number },
  ) {
    return this.userService.linkWorkspace(Number(id), data.workspaceId);
  }

  @Delete(':id')
  @GetAllowedRoles([], true)
  delete(@Param('id') id: string) {
    return this.userService.delete(Number(id));
  }
}
