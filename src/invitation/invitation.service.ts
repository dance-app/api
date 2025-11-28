import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  InvitationStatus,
  Workspace,
  Invitation,
  WorkspaceRole,
  Prisma,
} from '@prisma/client';
import { v4 as uuid } from 'uuid';

import {
  //CreateEventInvitationDto,
  CreateWorkspaceInvitationDto,
} from './dto/create-invitation.dto';
import { ReadInvitationDto } from './dto/read-invitation.dto';
import { InviteWithInviter } from './invitation.types';
import { UserCreatedEvent } from '../auth/event/user-created.event';
import { generateId, ID_PREFIXES } from '../lib/id-generator';

import { DatabaseService } from '@/database/database.service';
import { MailService } from '@/mail/mail.service';
import { MemberService } from '@/member/member.service';
import { PaginationService } from '@/pagination/pagination.service';
import { UserWithAccount } from '@/user/user.types';
import { WorkspaceService } from '@/workspace/workspace.service';

@Injectable()
export class InvitationService {
  private readonly logger = new Logger(InvitationService.name);
  private readonly INVITATION_EXPIRY_DAYS = 7;

  constructor(
    private database: DatabaseService,
    private readonly mailService: MailService,
    @Inject(forwardRef(() => WorkspaceService))
    private workspaceService: WorkspaceService,
    private memberService: MemberService,
    private pagination: PaginationService,
  ) {}

  @OnEvent('user.created')
  async handleUserCreated(event: UserCreatedEvent) {
    await this.linkPendingInvitationsWithUser(event.user, event.email);
  }

  private async linkPendingInvitationsWithUser(
    user: UserWithAccount,
    email: string,
  ): Promise<void> {
    const pendingInvitations = await this.database.invitation.findMany({
      where: {
        email: email,
        status: InvitationStatus.PENDING,
        inviteeId: null, // Not yet linked to a user
      },
    });

    if (pendingInvitations.length > 0) {
      await this.database.invitation.updateMany({
        where: {
          email: email,
          status: InvitationStatus.PENDING,
          inviteeId: null,
        },
        data: {
          inviteeId: user.id,
        },
      });

      this.logger.log(
        `Linked ${pendingInvitations.length} pending invitations to user ${user.id}`,
      );
    }
  }

  async findPendingWorkspaceInvites(
    workspaceId: string,
    inviteeId: string | undefined,
    email: string | undefined,
  ) {
    const existingInvitation = await this.database.invitation.findFirst({
      where: {
        type: 'WORKSPACE',
        OR: [
          {
            email,
            workspaceId: workspaceId,
            status: InvitationStatus.PENDING,
          },
          inviteeId
            ? {
                inviteeId,
                workspaceId: workspaceId,
                status: InvitationStatus.PENDING,
              }
            : {},
        ],
      },
    });
    return existingInvitation;
  }
  async createWorkspaceInvite(
    currentUser: UserWithAccount,
    dto: CreateWorkspaceInvitationDto,
  ): Promise<ReadInvitationDto> {
    const { email, inviteeId, workspaceSlug, memberSeatId } = dto;

    // Validate that at least email or inviteeId is provided
    if (!email && !inviteeId) {
      throw new BadRequestException(
        'Either email or inviteeId must be provided',
      );
    }

    // Find the workspace by slug
    const workspace =
      await this.workspaceService.getWorkspaceBySlug(workspaceSlug);

    // Check if user already has access to workspace
    let inviteeEmail: string | null = null;
    let invitee: UserWithAccount | null = null;
    if (inviteeId != undefined) {
      const existingMember = await this.memberService.getMemberByUserId(
        inviteeId,
        workspace.id,
      );

      if (existingMember) {
        throw new BadRequestException(
          'User is already a member of this workspace',
        );
      }

      const inviteeMember = await this.database.member.findUnique({
        where: {
          id: memberSeatId,
        },
        include: {
          user: {
            include: {
              accounts: true,
            },
          },
        },
      });
      if (!inviteeMember)
        throw new BadRequestException(
          'memberSeatId does not match an existing member',
        );
      invitee = inviteeMember.user;
      inviteeEmail = invitee?.accounts?.find((a) => !!a.email).email;
    }

    // Check if there's already a pending invitation for this email/user
    const existingInvitation = await this.findPendingWorkspaceInvites(
      workspace.id,
      inviteeId,
      email,
    );

    if (existingInvitation) {
      throw new BadRequestException(
        'There is already a pending invitation for this user',
      );
    }

    // Create a new invitation
    const expiresAt = new Date();
    expiresAt.setDate(new Date().getDate() + this.INVITATION_EXPIRY_DAYS);
    const token = uuid();

    // Create the invitation
    const invitationCreationQuery: Prisma.InvitationCreateArgs = {
      data: {
        id: generateId(ID_PREFIXES.INVITATION),
        email,
        firstName: '',
        lastName: '', // TODO
        token,
        expiresAt,
        workspace: {
          connect: {
            id: workspace.id,
          },
        },
        inviter: {
          connect: {
            id: currentUser.id,
          },
        },
        type: 'WORKSPACE',
      },
      include: {
        workspace: true,
        inviter: true,
      },
    };
    if (inviteeId !== undefined) {
      invitationCreationQuery.data.invitee = {
        connect: {
          id: inviteeId,
        },
      };
    }
    if (memberSeatId !== undefined) {
      invitationCreationQuery.data.memberSeat = {
        connect: {
          id: memberSeatId,
        },
      };
    }
    const invitation = await this.database.invitation.create(
      invitationCreationQuery,
    );

    // If email is provided, send invitation email
    const sendInviteByEmail = email || inviteeEmail;
    if (sendInviteByEmail) {
      try {
        const inviterName =
          `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() ||
          'A workspace admin';

        await this.mailService.sendWorkspaceInviteEmail(
          sendInviteByEmail,
          token,
          inviterName,
          workspace.name,
          WorkspaceRole.STUDENT, // Default role, TODO: in createDTO
        );
      } catch (error) {
        this.logger.error(
          `Failed to send invitation email to ${sendInviteByEmail}`,
          error,
        );
        // Don't fail the request if email sending fails
        // TODO: maybe return a status (emailSent: true | false)?
      }
    }

    return this.mapToInvitationDto(invitation);
  }

  // TODO
  /*async createEventInvite(
    currentUser: UserWithAccount,
    dto: CreateEventInvitationDto,
  ): Promise<ReadInvitationDto> {}*/

  async findWorkspaceInvitations(
    workspace: Workspace,
  ): Promise<ReadInvitationDto[]> {
    const invitations = await this.database.invitation.findMany({
      where: { workspaceId: workspace.id, type: 'WORKSPACE' },
      include: {
        workspace: true,
        inviter: true,
      },
    });

    return invitations.map((invitation) => this.mapToInvitationDto(invitation));
  }

  async findUserInvitations(
    currentUser: UserWithAccount,
  ): Promise<InviteWithInviter[]> {
    const userEmails = currentUser.accounts.map((account) => account.email);

    const invitations = await this.database.invitation.findMany({
      where: {
        OR: [{ inviteeId: currentUser.id }, { email: { in: userEmails } }],
      },
      include: {
        workspace: true,
        inviter: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return invitations;
  }
  async findUserInvitationsDto(
    currentUser: UserWithAccount,
  ): Promise<ReadInvitationDto[]> {
    const invitations = await this.findUserInvitations(currentUser);

    return invitations.map((invitation) => this.mapToInvitationDto(invitation));
  }

  async findInvitationByToken(token: string) {
    const invitation = await this.database.invitation.findUnique({
      where: { token },
      include: {
        workspace: true,
        inviter: true,
        memberSeat: true,
      },
    });

    return invitation;
  }

  async getInvitationByToken(token: string) {
    const invitation = await this.findInvitationByToken(token);

    if (!invitation) {
      throw new NotFoundException(`Invitation not found`);
    }

    return invitation;
  }

  private async _acceptInvitation(
    invitation: Invitation,
    currentUser: UserWithAccount,
  ) {
    const updatedInvitation = await this.database.$transaction(
      async (prisma) => {
        // Update the member to link to the user
        await prisma.member.update({
          where: { id: invitation.memberSeatId },
          data: {
            userId: currentUser.id,
            name:
              `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() ||
              undefined,
          },
        });

        // Update the invitation status
        return prisma.invitation.update({
          where: { id: invitation.id },
          data: {
            status: InvitationStatus.ACCEPTED,
            inviteeId: currentUser.id,
          },
          include: {
            workspace: true,
            inviter: true,
          },
        });
      },
    );
    return updatedInvitation;
  }
  async acceptInvitation(
    token: string,
    currentUser: UserWithAccount,
  ): Promise<ReadInvitationDto> {
    const invitation = await this.getInvitationByToken(token);

    // Check if invitation is still valid
    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException(
        `Invitation is ${invitation.status.toLowerCase()}`,
      );
    }

    if (invitation.expiresAt < new Date()) {
      throw new BadRequestException('Invitation has expired');
    }

    // Check if the invitation matches the current user
    if (invitation.inviteeId && invitation.inviteeId !== currentUser.id) {
      throw new BadRequestException('This invitation is for another user');
    }

    if (
      invitation.email &&
      !currentUser.accounts.some(
        (account) => account.email === invitation.email,
      )
    ) {
      throw new BadRequestException(
        'This invitation is for another email address',
      );
    }

    // Link the member seat to the user and accept the invitation
    const updatedInvitation = await this._acceptInvitation(
      invitation,
      currentUser,
    );

    return this.mapToInvitationDto(updatedInvitation);
  }

  async declineInvitation(
    token: string,
    currentUser: UserWithAccount,
  ): Promise<ReadInvitationDto> {
    const invitation = await this.getInvitationByToken(token);

    // Check if invitation is still valid
    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException(
        `Invitation is already ${invitation.status.toLowerCase()}`,
      );
    }

    // Check if the invitation matches the current user
    if (invitation.inviteeId && invitation.inviteeId !== currentUser.id) {
      throw new BadRequestException('This invitation is for another user');
    }

    if (
      invitation.email &&
      !currentUser.accounts.some(
        (account) => account.email === invitation.email,
      )
    ) {
      throw new BadRequestException(
        'This invitation is for another email address',
      );
    }

    // Update the invitation status to DECLINED
    const updatedInvitation = await this.database.invitation.update({
      where: { id: invitation.id },
      data: {
        status: InvitationStatus.DECLINED,
        inviteeId: currentUser.id,
      },
      include: {
        workspace: true,
        inviter: true,
      },
    });

    return this.mapToInvitationDto(updatedInvitation);
  }

  private mapToInvitationDto(
    invitation: Invitation | InviteWithInviter,
  ): ReadInvitationDto {
    return {
      id: invitation.id,
      type: invitation.type,
      createdAt: invitation.createdAt,
      updatedAt: invitation.updatedAt,
      email: invitation.email,
      firstName: invitation.firstName,
      lastName: invitation.lastName,
      token: invitation.token,
      expiresAt: invitation.expiresAt,
      status: invitation.status,
      workspaceId: invitation.workspaceId,
      workspaceName: 'workspace' in invitation && invitation.workspace?.name,
      workspaceSlug: 'workspace' in invitation && invitation.workspace?.slug,
      inviterId: invitation.inviterId,
      inviterName:
        'inviter' in invitation && invitation.inviter
          ? `${invitation.inviter.firstName || ''} ${invitation.inviter.lastName || ''}`.trim()
          : '',
      inviteeId: invitation.inviteeId,
      memberSeatId: invitation.memberSeatId,
    };
  }
}
