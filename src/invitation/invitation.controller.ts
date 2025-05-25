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
  //CreateEventInvitationDto,
  CreateWorkspaceInvitationDto,
} from './dto/create-invitation.dto';
import { ReadInvitationDto } from './dto/read-invitation.dto';
import { InvitationService } from './invitation.service';

import { GetAuthUser } from '@/auth/decorator';
import { JwtGuard } from '@/auth/guard';
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
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all invitations for the current user' })
  @ApiResponse({
    status: 200,
    description: 'List of user invitations',
    type: [ReadInvitationDto],
  })
  async getUserInvitations(
    @GetAuthUser() user: UserWithAccount, // TODO: filter by status?
  ): Promise<ReadInvitationDto[]> {
    return this.invitationService.findUserInvitationsDto(user);
  }

  @Post('workspace/:slug')
  @UseGuards(CanViewWorkspaceGuard, WorkspaceRolesGuard)
  @RequireWorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.TEACHER)
  @ApiOperation({ summary: 'Create a new workspace invitation' })
  @ApiResponse({
    status: 201,
    description: 'Invitation created successfully',
    type: ReadInvitationDto,
  })
  async createWorkspaceInvitation(
    @GetAuthUser() user: UserWithAccount,
    @Body()
    createInvitationDto: CreateWorkspaceInvitationDto,
  ): Promise<ReadInvitationDto> {
    return await this.invitationService.createWorkspaceInvite(
      user,
      createInvitationDto,
    );
  }
  /*@Post('event/:slug')
  @UseGuards(CanViewEventGuard, EventRolesGuard)
  @RequireEventRoles(EventRole.ORGANIZER)
  @ApiOperation({ summary: 'Create a new workspace invitation' })
  @ApiResponse({
    status: 201,
    description: 'Invitation created successfully',
    type: ReadInvitationDto,
  })
  async createEventInvitation(
    @GetAuthUser() user: UserWithAccount,
    @Body()
    createInvitationDto: CreateEventInvitationDto,
  ): Promise<ReadInvitationDto> {
    console.error(createInvitationDto);
    // TODO
    //return await this.invitationService.createEventInvite(user, eventDto);
  }*/

  @Get('workspace/:slug')
  @UseGuards(CanViewWorkspaceGuard, WorkspaceRolesGuard)
  @RequireWorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.TEACHER)
  @ApiOperation({ summary: 'Get all invitations for a workspace' })
  @ApiParam({ name: 'slug', description: 'Workspace slug' })
  @ApiResponse({
    status: 200,
    description: 'List of invitations',
    type: [ReadInvitationDto],
  })
  async getWorkspaceInvitations(
    @WorkspaceBySlug() workspace: Workspace,
  ): Promise<ReadInvitationDto[]> {
    return this.invitationService.findWorkspaceInvitations(workspace);
  }

  @Get('token/:token')
  @ApiOperation({ summary: 'Get invitation details by token' })
  @ApiParam({ name: 'token', description: 'Invitation token' })
  @ApiResponse({
    status: 200,
    description: 'Invitation details',
    type: ReadInvitationDto,
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
    type: ReadInvitationDto,
  })
  async acceptInvitation(
    @Param('token') token: string,
    @GetAuthUser() user: UserWithAccount,
  ): Promise<ReadInvitationDto> {
    return this.invitationService.acceptInvitation(token, user);
  }

  @Post('decline/:token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Decline an invitation' })
  @ApiParam({ name: 'token', description: 'Invitation token' })
  @ApiResponse({
    status: 200,
    description: 'Invitation declined',
    type: ReadInvitationDto,
  })
  async declineInvitation(
    @Param('token') token: string,
    @GetAuthUser() user: UserWithAccount,
  ): Promise<ReadInvitationDto> {
    return this.invitationService.declineInvitation(token, user);
  }
}
