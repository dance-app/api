import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import {
  NotificationType,
  Prisma,
  Notification,
  //WorkspaceRole,
  InvitationStatus,
} from '@prisma/client';

//import { NotificationResponseDto } from './dto/notification-response.dto';
import { SearchNotificationsDto } from './dto/search-notifications.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';

import { UserCreatedEvent } from '@/auth/event/user-created.event';
import { DatabaseService } from '@/database/database.service';
import { InvitationService } from '@/invitation/invitation.service';
import { PaginatedResponseDto, PaginationDto } from '@/pagination/dto';
import { PaginationService } from '@/pagination/pagination.service';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly invitationDetailsPrismaInclude: Prisma.NotificationInclude =
    {
      invitation: {
        include: {
          workspace: true,
          event: true,
          inviter: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      },
    };
  constructor(
    private readonly database: DatabaseService,
    private readonly paginationService: PaginationService,
    private readonly invitationService: InvitationService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ==========================================
  // Invitation-related notifications
  // ==========================================

  async createInvitationReceivedNotification(
    inviteeId: number,
    invitationId: number,
  ): Promise<Notification> {
    const notification = await this.database.notification.create({
      data: {
        userId: inviteeId,
        type: NotificationType.INVITATION_RECEIVED,
        invitationId,
      },
      include: {
        ...this.invitationDetailsPrismaInclude,
      },
    });

    this.logger.debug(
      `Created INVITATION_RECEIVED notification for user ${inviteeId}`,
    );
    return notification;
  }

  // Necessary? Redundant with joined (workspace or event)
  /*async createInvitationAcceptedNotification(
    inviterId: number,
    invitationId: number,
  ): Promise<void> {
    await this.database.notification.create({
      data: {
        userId: inviterId,
        type: NotificationType.INVITATION_ACCEPTED,
        invitationId,
      },
    });

    this.logger.debug(
      `Created INVITATION_ACCEPTED notification for user ${inviterId}`,
    );
  }*/

  // Do we want to know when a user declined an invitation?
  /*
  async createInvitationDeclinedNotification(
    inviterId: number,
    invitationId: number,
  ): Promise<void> {
    await this.database.notification.create({
      data: {
        userId: inviterId,
        type: NotificationType.INVITATION_DECLINED,
        invitationId,
      },
    });

    this.logger.debug(
      `Created INVITATION_DECLINED notification for user ${inviterId}`,
    );
  }*/

  // ==========================================
  // Workspace notifications
  // ==========================================

  /*async createWorkspaceMemberJoinedNotification(
    workspaceId: number,
    newMemberId: number,
    excludeUserId?: number, // Don't notify the person who joined
  ): Promise<void> {
    // Get all workspace members except the one who just joined
    const workspaceMembers = await this.database.member.findMany({
      where: {
        workspaceId,
        userId: {
          not: excludeUserId,
        },
        user: {
          isNot: null, // Only users with accounts
        },
        roles: {
          hasSome: [WorkspaceRole.OWNER],
        },
      },
      select: {
        userId: true,
      },
    });

    const notificationPromises = workspaceMembers.map((member) =>
      this.database.notification.create({
        data: {
          userId: member.userId!,
          type: NotificationType.WORKSPACE_MEMBER_JOINED,
          metadata: {
            workspaceId,
            newMemberId,
          },
        },
      }),
    );

    await Promise.all(notificationPromises);

    this.logger.debug(
      `Created WORKSPACE_MEMBER_JOINED notifications for ${workspaceMembers.length} users`,
    );
  }*/

  // Get user notifications with pagination and filtering (enriches metadata)
  async getUserNotifications(
    userId: number,
    queryParams: SearchNotificationsDto,
    paginationOptions: PaginationDto,
  ): Promise<PaginatedResponseDto<Notification>> {
    // TODO DTO
    const { read, type } = queryParams;
    const { skip, take } =
      this.paginationService.extractPaginationOptions(paginationOptions);

    const whereClause: Prisma.NotificationWhereInput = {
      userId,
      ...(read !== undefined && { read }),
      ...(type && { type }),
    };

    const [notifications, totalCount] = await Promise.all([
      this.database.notification.findMany({
        where: whereClause,
        skip,
        take,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          ...this.invitationDetailsPrismaInclude,
        },
      }),
      this.database.notification.count({
        where: whereClause,
      }),
    ]);

    return this.paginationService.createPaginatedResponse(
      notifications,
      totalCount,
      paginationOptions,
    );
  }

  // Get notification by ID (enriches metadata)
  async getNotification(id: number): Promise<Notification> {
    // TODO DTO
    const notification = await this.database.notification.findUnique({
      where: { id },
      include: {
        ...this.invitationDetailsPrismaInclude,
      },
    });

    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }

    return notification;
  }

  async getUserUnreadNotificationCount(userId: number): Promise<number> {
    const unreadCount = await this.database.notification.count({
      where: { userId, read: false },
    });

    return unreadCount;
  }

  // Mark notification as read/unread
  async updateNotification(
    id: number,
    updateNotificationDto: UpdateNotificationDto,
  ): Promise<Notification> {
    const notification = await this.database.notification.update({
      where: { id },
      data: {
        read: updateNotificationDto.read,
      },
      include: { ...this.invitationDetailsPrismaInclude },
    });

    this.logger.debug(`Updated notification ${id}`);
    return notification;
  }

  async markAllAsRead(userId: number): Promise<void> {
    await this.database.notification.updateMany({
      where: {
        userId,
        read: false,
      },
      data: {
        read: true,
      },
    });

    this.logger.debug(`Marked all notifications as read for user ${userId}`);
  }

  // Get unread notification count
  async getUnreadCount(userId: number): Promise<number> {
    return this.database.notification.count({
      where: {
        userId,
        read: false,
      },
    });
  }

  // Event listener for user creation to check for pending invitations
  @OnEvent('user.created')
  async handleUserCreated(event: UserCreatedEvent): Promise<void> {
    this.logger.debug(`Handling user created event for user ${event.user.id}`);

    // Find pending invitations for this email
    const invitations = await this.invitationService.findUserInvitations(
      event.user,
    );
    const pendingInvitations = invitations.filter(
      (i) => i.status === InvitationStatus.PENDING,
    );

    // Create notifications for each pending invitation
    for (const invitation of pendingInvitations) {
      await this.createInvitationReceivedNotification(
        event.user.id,
        invitation.id,
      );
    }

    this.logger.debug(
      `Created notifications for ${pendingInvitations.length} pending invitations for user ${event.user.id}`,
    );
  }
}
