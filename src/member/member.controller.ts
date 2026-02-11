import {
  Controller,
  Get,
  Post,
  UseGuards,
  Body,
  Param,
  Query,
  Delete,
  Patch,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { Workspace, WorkspaceRole } from '@prisma/client';

import { AddMemberDto } from './dto/add-member.dto';
import { SearchMembersDto } from './dto/search-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { MemberService } from './member.service';

import { GetAuthUser } from '@/auth/decorator';
import { JwtGuard } from '@/auth/guard';
import { buildResponse } from '@/lib/api-response';
import { GetPagination } from '@/pagination/decorator';
import { PaginationDto } from '@/pagination/dto';
import { UserWithAccount } from '@/user/user.types';
import { WorkspaceBySlug } from '@/workspace/decorator/workspace.decorator';
import {
  CanViewWorkspaceGuard,
  RequireWorkspaceRoles,
  WorkspaceRolesGuard,
} from '@/workspace/guard';

@ApiBearerAuth()
@UseGuards(JwtGuard, CanViewWorkspaceGuard, WorkspaceRolesGuard)
@Controller('workspaces/:slug/members')
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
    @GetPagination() paginationOptions: PaginationDto,
  ) {
    const result = await this.memberService.getWorkspaceMembers(
      workspace.id,
      queryParams,
      paginationOptions,
    );
    return buildResponse(result.data, result.meta);
  }

  @Post()
  @RequireWorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.TEACHER)
  async addMember(
    @GetAuthUser() user: UserWithAccount,
    @WorkspaceBySlug() workspace: Workspace,
    @Body() addMemberDto: AddMemberDto,
  ) {
    const member = await this.memberService.create(
      user,
      addMemberDto,
      workspace,
    );
    return buildResponse(member);
  }

  @Get(':id')
  @RequireWorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.TEACHER)
  async readById(@Param('id') id: string) {
    const member = await this.memberService.getMember(id);
    const memberDto = member
      ? this.memberService.mapToMemberResponseDto(member)
      : null;
    return buildResponse(memberDto);
  }

  @Patch(':memberId')
  @RequireWorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.TEACHER)
  async updateMember(
    @WorkspaceBySlug() workspace: Workspace,
    @GetAuthUser() user: UserWithAccount,
    @Param('memberId') memberId: string,
    @Body() updateMemberDto: UpdateMemberDto,
  ) {
    const member = await this.memberService.updateMember(
      workspace,
      user,
      memberId,
      updateMemberDto,
    );
    return buildResponse(member);
  }

  @Delete(':memberId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequireWorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.TEACHER)
  async removeMember(
    @WorkspaceBySlug() workspace: Workspace,
    @GetAuthUser() user: UserWithAccount,
    @Param('memberId') memberId: string,
  ): Promise<void> {
    // TODO: add interceptors
    const memberToDelete = await this.memberService.findMember(memberId);
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
    await this.memberService.delete(memberToDelete.id, user.id);
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
