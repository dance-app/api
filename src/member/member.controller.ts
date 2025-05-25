import {
  Controller,
  Get,
  Post,
  UseGuards,
  Body,
  Param,
  Query,
  ParseIntPipe,
  Delete,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { Workspace, WorkspaceRole } from '@prisma/client';
import { Request } from 'express';

import { AddMemberDto } from './dto/add-member.dto';
import { MemberResponseDto } from './dto/member-response.dto';
import { SearchMembersDto } from './dto/search-member.dto';
import { MemberService } from './member.service';

import { GetAuthUser } from '@/auth/decorator';
import { JwtGuard } from '@/auth/guard';
import { GetPagination } from '@/pagination/decorator';
import { PaginatedResponseDto, PaginationDto } from '@/pagination/dto';
import { UserWithAccount } from '@/user/user.types';
import { WorkspaceBySlug } from '@/workspace/decorator/workspace.decorator';
import {
  CanViewWorkspaceGuard,
  RequireWorkspaceRoles,
  WorkspaceRolesGuard,
} from '@/workspace/guard';

@ApiBearerAuth()
@UseGuards(JwtGuard, CanViewWorkspaceGuard, WorkspaceRolesGuard)
@Controller('workspace/:slug/members')
@ApiParam({
  name: 'slug',
  type: 'string',
  description: 'Workspace slug identifier',
  example: 'studio-a',
})
export class MemberController {
  constructor(private memberService: MemberService) {}

  @Get()
  @RequireWorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.TEACHER)
  async getMembers(
    @WorkspaceBySlug() workspace: Workspace,
    @Query() queryParams: SearchMembersDto,
    @Req() req: Request,
    @GetPagination() paginationOptions: PaginationDto,
  ): Promise<PaginatedResponseDto<MemberResponseDto>> {
    return await this.memberService.getWorkspaceMembers(
      workspace.id,
      queryParams,
      paginationOptions,
    );
  }

  @Post()
  @RequireWorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.TEACHER)
  async addMember(
    @GetAuthUser() user: UserWithAccount,
    @WorkspaceBySlug() workspace: Workspace,
    @Body() addMemberDto: AddMemberDto,
  ): Promise<MemberResponseDto> {
    return this.memberService.create(user, addMemberDto, workspace);
  }

  @Get(':id')
  @RequireWorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.TEACHER)
  async readById(@Param('id') id: number) {
    return await this.memberService.getMember(id);
  }

  // @Patch(':id')
  // updateUser(@Param('id') id: string, @Body() data: UserDto) {
  //   return this.memberService.update(Number(id), data);
  // }

  @Delete(':memberId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequireWorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.TEACHER)
  async removeMember(
    @WorkspaceBySlug() workspace: Workspace,
    @GetAuthUser() user: UserWithAccount,
    @Param('memberId', ParseIntPipe) memberId: number,
  ): Promise<void> {
    // TODO: add interceptors
    const memberToDelete = await this.memberService.getMember(memberId);
    const currentMember = await this.memberService.getMemberByUserId(
      user.id,
      workspace.id,
    );
    if (
      memberToDelete.roles.includes(WorkspaceRole.OWNER) &&
      !currentMember.roles.includes(WorkspaceRole.OWNER)
    ) {
      throw new UnauthorizedException('You cannot delete this member');
    }
    await this.memberService.delete(memberToDelete.id);
  }

  @Delete() // Leave the workspace
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequireWorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.TEACHER)
  async leaveWorkspace(
    @WorkspaceBySlug() workspace: Workspace,
    @GetAuthUser() user: UserWithAccount,
  ): Promise<void> {
    await this.memberService.deleteByUserId(user.id, workspace.id);
  }
}
