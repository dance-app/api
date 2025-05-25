import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Delete,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { User, WorkspaceRole } from '@prisma/client';

import { WorkspaceDto } from './dto';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import {
  CanViewWorkspaceGuard,
  RequireWorkspaceRoles,
  WorkspaceRolesGuard,
} from './guard';
import { WorkspaceService } from './workspace.service';

import { GetAuthUser } from '@/auth/decorator';
import { JwtGuard } from '@/auth/guard';
import { MemberService } from '@/member/member.service';
import { GetPagination } from '@/pagination/decorator';
import { PaginationDto } from '@/pagination/dto';
import { UserService } from '@/user/user.service';
import { UserWithAccount } from '@/user/user.types';

@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller('workspaces')
export class WorkspaceController {
  constructor(
    private workspaceService: WorkspaceService,
    private memberService: MemberService,
    private userService: UserService,
  ) {}

  @Post()
  async create(@Body() data: CreateWorkspaceDto, @GetAuthUser() user: User) {
    // If ownerId is provided and user is super admin, create workspace for that user
    if (user.isSuperAdmin) {
      return await this.workspaceService.createWithOwner(
        data,
        user.id, // createdById (super admin)
        data.ownerId, // ownerId (the assigned owner)
      );
    }
    if (data.ownerId !== undefined && data.ownerId !== user.id)
      throw new BadRequestException();

    // Regular case - user creates their own workspace
    return await this.workspaceService.create(data, user.id);
  }

  @Get()
  async getAll(
    @GetAuthUser() user: UserWithAccount,
    @GetPagination() paginationOptions: PaginationDto,
  ) {
    if (user.isSuperAdmin) {
      return await this.workspaceService.readAll(paginationOptions);
    }
    return await this.workspaceService.readMyWorkspaces(user);
  }

  @Get('slug/:slug')
  @UseGuards(CanViewWorkspaceGuard)
  async getBySlug(@Param('slug') slug: string) {
    return await this.workspaceService.getWorkspaceBySlug(slug);
  }

  @Get(':id')
  @UseGuards(CanViewWorkspaceGuard)
  async getById(@Param('id') id: string) {
    return await this.workspaceService.readById({ id: Number(id) });
  }

  @Patch(':id')
  @UseGuards(CanViewWorkspaceGuard, WorkspaceRolesGuard)
  @RequireWorkspaceRoles(WorkspaceRole.OWNER)
  async update(@Param('id') id: string, @Body() data: WorkspaceDto) {
    return await this.workspaceService.update(Number(id), data);
  }

  @Delete(':id')
  @UseGuards(CanViewWorkspaceGuard, WorkspaceRolesGuard)
  @RequireWorkspaceRoles(WorkspaceRole.OWNER)
  async delete(@Param('id') id: string) {
    return await this.workspaceService.delete(Number(id));
  }
}
