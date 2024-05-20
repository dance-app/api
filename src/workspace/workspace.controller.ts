import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { GetAuthUser } from 'src/auth/decorator';
import { JwtGuard } from 'src/auth/guard';
import { GetPagination } from 'src/pagination/decorator';
import { PaginationDto } from 'src/pagination/dto';
import { UserWithAccount } from 'src/user/user.types';

import { WorkspaceDto } from './dto';
import { WorkspaceService } from './workspace.service';
@UseGuards(JwtGuard)
@Controller('workspaces')
export class WorkspaceController {
  constructor(private workspaceService: WorkspaceService) {}

  @Post('')
  create(@Body() data: WorkspaceDto) {
    return this.workspaceService.create(data);
  }

  @Get('')
  getAll(@GetPagination() paginationOptions: PaginationDto) {
    return this.workspaceService.readAll(paginationOptions);
  }

  @Get('mine')
  getMyWorkspace(@GetAuthUser() user: UserWithAccount) {
    return this.workspaceService.readMyWorkspace({ user });
  }

  @Get('slug')
  getBySlug(@Query('value') value: string) {
    return this.workspaceService.readBySlug({ slug: value });
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.workspaceService.readById({ id: Number(id) });
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: WorkspaceDto) {
    return this.workspaceService.update(Number(id), data);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.workspaceService.delete(Number(id));
  }
}
