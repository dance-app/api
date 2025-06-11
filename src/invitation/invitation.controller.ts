import {
  Controller,
  Get,
  Post,
  UseGuards,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Workspace, WorkspaceRole } from '@prisma/client';

import {
  CreateEventInvitationDto,
  //CreateEventInvitationDto,
  CreateWorkspaceInvitationDto,
} from './dto/create-invitation.dto';
import {
  ReadEventInvitationDto,
  ReadWorkspaceInvitationDto,
} from './dto/read-invitation.dto';
import { InvitationService } from './invitation.service';

import { GetAuthUser } from '@/auth/decorator';
import { JwtGuard } from '@/auth/guard';
import { EventById } from '@/event/decorator/event.decorator';
import { IsEventOrganizerGuard } from '@/event/guard/is-organizer.guard';
import { UserWithAccount } from '@/user/user.types';
import { WorkspaceBySlug } from '@/workspace/decorator/workspace.decorator';
import {
  CanViewWorkspaceGuard,
  RequireWorkspaceRoles,
  WorkspaceRolesGuard,
} from '@/workspace/guard';

@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller('invitations')
@ApiTags('invitations')
export class InvitationController {
  constructor(private readonly invitationService: InvitationService) {}

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all invitations for the current user' })
  @ApiResponse({
    status: 200,
    description: 'List of user invitations',
    type: [ReadWorkspaceInvitationDto || ReadEventInvitationDto],
  })
  async getUserInvitations(
    @GetAuthUser() user: UserWithAccount, // TODO: filter by type & status?
  ): Promise<(ReadWorkspaceInvitationDto | ReadEventInvitationDto)[]> {
    return this.invitationService.findUserInvitationsDto(user);
  }

  @Post('workspace/:slug') // TODO: slug query param is not used here. It's redundant with the dto
  @UseGuards(CanViewWorkspaceGuard, WorkspaceRolesGuard)
  @RequireWorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.TEACHER)
  @ApiOperation({ summary: 'Create a new workspace invitation' })
  @ApiResponse({
    status: 201,
    description: 'Invitation created successfully',
    type: ReadWorkspaceInvitationDto,
  })
  async createWorkspaceInvitation(
    @GetAuthUser() user: UserWithAccount,
    @Body()
    createInvitationDto: CreateWorkspaceInvitationDto,
  ): Promise<ReadWorkspaceInvitationDto> {
    return await this.invitationService.createWorkspaceInvite(
      user,
      createInvitationDto,
    );
  }
  @Post('event/:eventId') // TODO: eventId query param is not used here. It's redundant with the dto
  @UseGuards(IsEventOrganizerGuard)
  @ApiOperation({ summary: 'Create a new workspace invitation' })
  @ApiResponse({
    status: 201,
    description: 'Invitation created successfully',
    type: ReadEventInvitationDto,
  })
  async createEventInvitation(
    @GetAuthUser() user: UserWithAccount,
    @EventById('eventId') event,
    @Body()
    createInvitationDto: CreateEventInvitationDto,
  ): Promise<ReadEventInvitationDto> {
    return await this.invitationService.createEventInvite(
      user,
      createInvitationDto,
    );
  }

  @Get('workspace/:slug')
  @UseGuards(CanViewWorkspaceGuard, WorkspaceRolesGuard)
  @RequireWorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.TEACHER)
  @ApiOperation({ summary: 'Get all invitations for a workspace' })
  @ApiParam({ name: 'slug', description: 'Workspace slug' })
  @ApiResponse({
    status: 200,
    description: 'List of invitations',
    type: [ReadWorkspaceInvitationDto],
  })
  async getWorkspaceInvitations(
    @WorkspaceBySlug() workspace: Workspace,
  ): Promise<ReadWorkspaceInvitationDto[]> {
    return this.invitationService.findWorkspaceInvitations(workspace);
  }

  @Get('token/:token')
  @ApiOperation({ summary: 'Get invitation details by token' })
  @ApiParam({ name: 'token', description: 'Invitation token' })
  @ApiResponse({
    status: 200,
    description: 'Invitation details',
    type: ReadWorkspaceInvitationDto || ReadEventInvitationDto,
  })
  async getInvitationByToken(@Param('token') token: string) {
    const invitation = await this.invitationService.getInvitationByToken(token);
    return invitation;
  }

  @Post('accept/:token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept an invitation' })
  @ApiParam({ name: 'token', description: 'Invitation token' })
  @ApiResponse({
    status: 200,
    description: 'Invitation accepted',
    type: ReadWorkspaceInvitationDto || ReadEventInvitationDto,
  })
  async acceptInvitation(
    @Param('token') token: string,
    @GetAuthUser() user: UserWithAccount,
  ): Promise<ReadWorkspaceInvitationDto | ReadEventInvitationDto> {
    return this.invitationService.acceptInvitation(token, user);
  }

  @Post('decline/:token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Decline an invitation' })
  @ApiParam({ name: 'token', description: 'Invitation token' })
  @ApiResponse({
    status: 200,
    description: 'Invitation declined',
    type: ReadWorkspaceInvitationDto || ReadEventInvitationDto,
  })
  async declineInvitation(
    @Param('token') token: string,
    @GetAuthUser() user: UserWithAccount,
  ): Promise<ReadWorkspaceInvitationDto | ReadEventInvitationDto> {
    return this.invitationService.declineInvitation(token, user);
  }
}
