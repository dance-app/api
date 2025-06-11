import {
  AccountProvider,
  AttendanceAction,
  DanceRole,
  InvitationStatus,
  InviteType,
  PrismaClient,
  WorkspaceRole,
} from '@prisma/client';
import * as argon2 from 'argon2';

import {
  CreateEventOptions,
  CreateMemberOptions,
  CreateUserOptions,
  CreateWorkspaceOptions,
  TestDataFactory,
} from './mock-data';

import { DanceLevel } from '@/member/enums/dance-level.enum';
import { UserWithAccount } from '@/user/user.types';
export interface MockUserDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}
export class PrismaTestingService {
  client = new PrismaClient();
  async reset() {
    // Order matters due to foreign key constraints
    const deleteOperations = [
      this.client.attendanceHistory.deleteMany(),
      this.client.notification.deleteMany(),
      this.client.invitation.deleteMany(),
      this.client.attendee.deleteMany(),
      this.client.eventOrganizer.deleteMany(),
      this.client.event.deleteMany(),
      this.client.member.deleteMany(),
      this.client.workspaceConfig.deleteMany(),
      this.client.workspace.deleteMany(),
      this.client.passwordResetToken.deleteMany(),
      this.client.emailConfirmationToken.deleteMany(),
      this.client.account.deleteMany(),
      this.client.user.deleteMany(),
    ];

    return await this.client.$transaction(deleteOperations);
  }

  async close() {
    await this.reset();
    await this.client.$disconnect();
  }
  // ============================================================================
  // User Creation
  // ============================================================================

  async createUser(
    data: MockUserDto,
    options: CreateUserOptions = {},
  ): Promise<UserWithAccount> {
    const {
      verifyEmail = true,
      superAdmin = false,
      provider = AccountProvider.LOCAL,
    } = options;

    const hashedPassword =
      provider === AccountProvider.LOCAL
        ? await argon2.hash(data.password)
        : null;

    const user = await this.client.user.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        isSuperAdmin: superAdmin,
        accounts: {
          create: {
            provider,
            email: data.email,
            password: hashedPassword,
            isEmailVerified: verifyEmail,
          },
        },
      },
      include: {
        accounts: true,
      },
    });

    return user;
  }

  async createSuperAdmin(data: MockUserDto): Promise<UserWithAccount> {
    return this.createUser(data, { verifyEmail: true, superAdmin: true });
  }

  async createMockUser(options: CreateUserOptions = {}) {
    const mockData = TestDataFactory.createMockUserDto();
    return {
      user: await this.createUser(mockData, options),
      password: mockData.password,
      email: mockData.email,
    };
  }

  async createMockSuperAdmin() {
    const mockData = TestDataFactory.createMockUserDto();
    return {
      user: await this.createSuperAdmin(mockData),
      password: mockData.password,
      email: mockData.email,
    };
  }

  // ============================================================================
  // Workspace Creation
  // ============================================================================

  async createWorkspace(
    createdByUserId: number,
    options: CreateWorkspaceOptions = {},
  ) {
    const workspaceData = TestDataFactory.createWorkspaceData(options);
    const { members = [], createMockStudents = 0 } = options;

    // Create mock students if requested
    const allMembers = [...members];
    for (let i = 0; i < createMockStudents; i++) {
      const mockUser = await this.createMockUser();
      allMembers.push({
        user: mockUser.user,
        roles: [WorkspaceRole.STUDENT],
        name: `${mockUser.user.firstName} ${mockUser.user.lastName}`,
      });
    }

    const memberData = allMembers.map((member) => ({
      createdById: createdByUserId,
      userId: member.user.id,
      name: member.name || `${member.user.firstName} ${member.user.lastName}`,
      roles: member.roles,
      level: member.level || null,
    }));

    const workspace = await this.client.workspace.create({
      data: {
        name: workspaceData.name,
        slug: workspaceData.slug,
        createdById: createdByUserId,
        configuration: {
          create: {
            weekStart: workspaceData.weekStart,
          },
        },
        members: {
          createMany: {
            data: memberData,
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              include: {
                accounts: true,
              },
            },
          },
        },
        configuration: true,
      },
    });

    return {
      workspace,
      members: allMembers,
    };
  }

  async createMockWorkspace(
    createdByUserId: number,
    options: CreateWorkspaceOptions = {},
  ) {
    return this.createWorkspace(createdByUserId, {
      ...TestDataFactory.createWorkspaceData(),
      ...options,
    });
  }

  // ============================================================================
  // Member Creation
  // ============================================================================

  async createMemberSeat(
    createdById: number,
    workspaceId: number,
    options: CreateMemberOptions,
  ) {
    const { name, level, roles, userId } = options;

    return this.client.member.create({
      data: {
        createdById,
        workspaceId,
        userId,
        name,
        level,
        roles,
      },
      include: {
        user: {
          include: {
            accounts: true,
          },
        },
        workspace: true,
      },
    });
  }

  // ============================================================================
  // Event Creation
  // ============================================================================

  async createEvent(
    createdByUserId: number,
    workspaceId: number,
    options: CreateEventOptions = {},
  ) {
    const eventData = TestDataFactory.createEventData(options);
    const { organizerIds = [] } = options;

    const event = await this.client.event.create({
      data: {
        name: eventData.name,
        description: eventData.description,
        dateStart: eventData.dateStart,
        dateEnd: eventData.dateEnd,
        location: eventData.location,
        visibility: eventData.visibility,
        capacityMax: eventData.capacityMax,
        createdById: createdByUserId,
        workspaceId,
        organizers: {
          createMany: {
            data: [
              { userId: createdByUserId }, // Creator is always an organizer
              ...organizerIds.map((userId) => ({ userId })),
            ],
          },
        },
      },
      include: {
        organizers: {
          include: {
            user: {
              include: {
                accounts: true,
              },
            },
          },
        },
        workspace: true,
      },
    });

    return event;
  }

  async createMockEvent(
    createdByUserId: number,
    workspaceId: number,
    options: CreateEventOptions = {},
  ) {
    return this.createEvent(createdByUserId, workspaceId, {
      ...TestDataFactory.createEventData(),
      ...options,
    });
  }

  // ============================================================================
  // Token Management
  // ============================================================================

  async getEmailVerificationToken(email: string): Promise<string | null> {
    const account = await this.client.account.findFirst({
      where: { email },
      include: { emailToken: true },
    });
    return account?.emailToken?.token || null;
  }

  async getResetToken(email: string): Promise<string | null> {
    const account = await this.client.account.findFirst({
      where: { email },
      include: { resetToken: true },
    });
    return account?.resetToken?.token || null;
  }

  async verifyEmail(email: string): Promise<void> {
    await this.client.account.updateMany({
      where: { email },
      data: { isEmailVerified: true },
    });
  }

  async expireEmailVerificationToken(email: string): Promise<void> {
    await this.client.emailConfirmationToken.updateMany({
      where: { account: { email } },
      data: { expiresAt: new Date() },
    });
  }

  async expireResetToken(email: string): Promise<void> {
    await this.client.passwordResetToken.updateMany({
      where: { account: { email } },
      data: { expiresAt: new Date() },
    });
  }

  // ============================================================================
  // Invitation Creation Methods
  // ============================================================================

  /**
   * Creates workspace invitations with member seats
   */
  async createWorkspaceInvitations(
    workspaceId: number,
    inviterId: number,
    invitationSpecs: Array<{
      email?: string;
      inviteeId?: number;
      firstName?: string;
      lastName?: string;
      memberName: string;
      roles: WorkspaceRole[];
      level?: DanceLevel;
    }>,
  ) {
    const invitations = [];

    for (const spec of invitationSpecs) {
      // Create member seat first
      const memberSeat = await this.createMemberSeat(inviterId, workspaceId, {
        name: spec.memberName,
        roles: spec.roles,
        level: spec.level,
        userId: spec.inviteeId, // Link to user if provided
      });

      // Create invitation
      const invitationData = TestDataFactory.createInvitationData({
        type: InviteType.WORKSPACE,
        email: spec.email,
        firstName: spec.firstName,
        lastName: spec.lastName,
      });

      const invitation = await this.client.invitation.create({
        data: {
          ...invitationData,
          workspace: {
            connect: {
              id: workspaceId,
            },
          },
          memberSeat: {
            connect: {
              id: memberSeat.id,
            },
          },
          inviter: {
            connect: {
              id: inviterId,
            },
          },
          invitee: spec.inviteeId
            ? {
                connect: {
                  id: spec.inviteeId,
                },
              }
            : undefined,
        },
        include: {
          memberSeat: true,
          workspace: true,
          inviter: true,
          invitee: true,
        },
      });

      invitations.push(invitation);
    }

    return invitations;
  }

  async createWorkspaceInvitation(
    workspaceId: number,
    inviterId: number,
    spec: {
      email?: string;
      inviteeId?: number;
      firstName?: string;
      lastName?: string;
      memberName: string;
      roles: WorkspaceRole[];
      level?: DanceLevel;
    },
  ) {
    const invitations = await this.createWorkspaceInvitations(
      workspaceId,
      inviterId,
      [spec],
    );
    return invitations[0];
  }

  /**
   * Creates an expired invitation for testing expiration scenarios
   */
  async createExpiredInvitation(
    workspaceId: number,
    inviterId: number,
    email: string,
  ) {
    // Create member seat
    const memberSeat = await this.createMemberSeat(inviterId, workspaceId, {
      name: 'Expired User',
      roles: [WorkspaceRole.STUDENT],
    });

    // Create expired invitation
    const invitationData = TestDataFactory.createExpiredInvitationData({
      type: InviteType.WORKSPACE,
      email,
    });

    return this.client.invitation.create({
      data: {
        ...invitationData,
        workspace: {
          connect: {
            id: workspaceId,
          },
        },
        inviter: {
          connect: {
            id: inviterId,
          },
        },
        memberSeat: {
          connect: {
            id: memberSeat.id,
          },
        },
      },
    });
  }

  /**
   * Creates event invitations with attendee seats
   */
  /*async createEventInvitations(
    eventId: number,
    inviterId: number,
    invitationSpecs: Array<{
      email?: string;
      inviteeId?: number;
      firstName?: string;
      lastName?: string;
      guestName?: string;
      role?: DanceRole;
    }>,
  ) {
    const invitations = [];

    for (const spec of invitationSpecs) {
      // Create attendee seat first
      const attendee = await this.client.attendee.create({
        data: {
          eventId,
          userId: spec.inviteeId,
          guestEmail: spec.email,
          guestName: spec.guestName,
          role: spec.role,
          historyEntries: {
            create: {
              action: 'REGISTERED',
              performedById: inviterId,
            },
          },
        },
      });

      // Create invitation
      const invitationData = TestDataFactory.createInvitationData({
        type: InviteType.EVENT,
        email: spec.email,
        firstName: spec.firstName,
        lastName: spec.lastName,
        eventId,
        inviterId,
        inviteeId: spec.inviteeId,
        attendeeSeatId: attendee.id,
      });

      const invitation = await this.client.invitation.create({
        data: invitationData,
        include: {
          attendeeSeat: true,
          event: true,
          inviter: true,
          invitee: true,
        },
      });

      invitations.push(invitation);
    }

    return invitations;
  }*/

  /**
   * Creates a single event invitation
   */
  /*async createEventInvitation(
    eventId: number,
    inviterId: number,
    spec: {
      email?: string;
      inviteeId?: number;
      firstName?: string;
      lastName?: string;
      guestName?: string;
      role?: DanceRole;
    },
  ) {
    const invitations = await this.createEventInvitations(eventId, inviterId, [
      spec,
    ]);
    return invitations[0];
  }*/

  /**
   * Accepts an invitation (changes status and links user)
   */
  async acceptInvitation(invitationId: number, userId: number) {
    const invitation = await this.client.invitation.findUnique({
      where: { id: invitationId },
      include: { memberSeat: true, attendeeSeat: true },
    });

    if (!invitation) {
      throw new Error(`Invitation ${invitationId} not found`);
    }

    // Update invitation status
    const updatedInvitation = await this.client.invitation.update({
      where: { id: invitationId },
      data: {
        status: InvitationStatus.ACCEPTED,
        inviteeId: userId,
      },
    });

    // Link user to member seat (for workspace invitations)
    if (invitation.memberSeatId) {
      await this.client.member.update({
        where: { id: invitation.memberSeatId },
        data: { userId },
      });
    }

    // Link user to attendee seat (for event invitations)
    if (invitation.attendeeSeatId) {
      await this.client.attendee.update({
        where: { id: invitation.attendeeSeatId },
        data: { userId },
      });
    }

    return updatedInvitation;
  }

  /**
   * Declines an invitation (changes status only)
   */
  async declineInvitation(invitationId: number, userId: number) {
    return this.client.invitation.update({
      where: { id: invitationId },
      data: {
        status: InvitationStatus.DECLINED,
        inviteeId: userId,
      },
    });
  }

  /**
   * Finds invitations by workspace
   */
  async findWorkspaceInvitations(
    workspaceId: number,
    status?: InvitationStatus,
  ) {
    return this.client.invitation.findMany({
      where: {
        workspaceId,
        type: InviteType.WORKSPACE,
        ...(status && { status }),
      },
      include: {
        memberSeat: true,
        inviter: true,
        invitee: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Finds invitations by event
   */
  async findEventInvitations(eventId: number, status?: InvitationStatus) {
    return this.client.invitation.findMany({
      where: {
        eventId,
        type: InviteType.EVENT,
        ...(status && { status }),
      },
      include: {
        attendeeSeat: true,
        inviter: true,
        invitee: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Finds invitations for a specific user (as invitee)
   */
  async findUserInvitations(userId: number, status?: InvitationStatus) {
    return this.client.invitation.findMany({
      where: {
        inviteeId: userId,
        ...(status && { status }),
      },
      include: {
        workspace: true,
        event: true,
        memberSeat: true,
        attendeeSeat: true,
        inviter: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Finds invitations by email (for users who haven't signed up yet)
   */
  async findInvitationsByEmail(email: string, status?: InvitationStatus) {
    return this.client.invitation.findMany({
      where: {
        email,
        ...(status && { status }),
      },
      include: {
        workspace: true,
        event: true,
        memberSeat: true,
        attendeeSeat: true,
        inviter: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Finds invitation by token
   */
  async findInvitationByToken(token: string) {
    return this.client.invitation.findUnique({
      where: { token },
      include: {
        workspace: true,
        event: true,
        memberSeat: true,
        attendeeSeat: true,
        inviter: true,
        invitee: true,
      },
    });
  }

  // ============================================================================
  // Attendee Creation Methods
  // ============================================================================

  /**
   * Creates attendee seats for an event
   */
  async createAttendeeSeats(
    eventId: number,
    performedById: number,
    attendeeSpecs: Array<{
      userId?: number;
      guestEmail?: string;
      guestName?: string;
      role?: DanceRole;
      action?: AttendanceAction;
    }>,
  ) {
    const attendees = [];

    for (const spec of attendeeSpecs) {
      const attendee = await this.client.attendee.create({
        data: {
          eventId,
          userId: spec.userId,
          guestEmail: spec.guestEmail,
          guestName: spec.guestName,
          role: spec.role,
          historyEntries: {
            create: {
              action: spec.action || 'REGISTERED',
              performedById,
            },
          },
        },
        include: {
          user: {
            include: {
              accounts: true,
            },
          },
          historyEntries: {
            include: {
              performedBy: true,
            },
          },
        },
      });

      attendees.push(attendee);
    }

    return attendees;
  }

  /**
   * Creates a single attendee seat
   */
  async createAttendeeSeat(
    eventId: number,
    performedById: number,
    spec: {
      userId?: number;
      guestEmail?: string;
      guestName?: string;
      role?: DanceRole;
      action?: AttendanceAction;
    },
  ) {
    const attendees = await this.createAttendeeSeats(eventId, performedById, [
      spec,
    ]);
    return attendees[0];
  }

  // ============================================================================
  // Complex Invitation Scenarios
  // ============================================================================

  /**
   * Creates a complete invitation scenario for testing flows
   */
  async createInvitationScenario(options: {
    workspaceOwnerId: number;
    inviteeCount?: number;
    withExistingUsers?: boolean;
    withEvents?: boolean;
  }) {
    const {
      workspaceOwnerId,
      inviteeCount = 3,
      withExistingUsers = false,
      withEvents = false,
    } = options;

    // Create workspace
    const { workspace } = await this.createWorkspace(workspaceOwnerId, {
      name: 'Invitation Test Studio',
      slug: TestDataFactory.createUniqueSlug('invitation-test'),
    });

    // Create invitees (existing users or just emails)
    const inviteeSpecs = [];
    for (let i = 0; i < inviteeCount; i++) {
      if (withExistingUsers) {
        const user = await this.createMockUser();
        inviteeSpecs.push({
          inviteeId: user.user.id,
          email: user.user.accounts[0].email,
          firstName: user.user.firstName,
          lastName: user.user.lastName,
          memberName: `${user.user.firstName} ${user.user.lastName}`,
          roles: [WorkspaceRole.STUDENT],
        });
      } else {
        const email = TestDataFactory.createUniqueEmail(`invitee${i}`);
        inviteeSpecs.push({
          email,
          firstName: `Invitee${i}`,
          lastName: 'User',
          memberName: `Invitee${i} User`,
          roles: [WorkspaceRole.STUDENT],
        });
      }
    }

    // Create workspace invitations
    /*const workspaceInvitations = await this.createWorkspaceInvitations(
      workspace.id,
      workspaceOwnerId,
      inviteeSpecs,
    );

    let eventInvitations = [];
    let event = null;

    // Create event and event invitations if requested
    if (withEvents) {
      event = await this.createEvent(workspaceOwnerId, workspace.id, {
        name: 'Invitation Test Event',
      });

      const eventInviteeSpecs = inviteeSpecs.map((spec) => ({
        email: spec.email,
        inviteeId: spec.inviteeId,
        firstName: spec.firstName,
        lastName: spec.lastName,
        guestName: spec.memberName,
      }));

      eventInvitations = await this.createEventInvitations(
        event.id,
        workspaceOwnerId,
        eventInviteeSpecs,
      );
    }*/

    return {
      workspace,
      //workspaceInvitations,
      //event,
      //eventInvitations,
      inviteeSpecs,
    };
  }

  // ============================================================================
  // Utility Methods for Invitations
  // ============================================================================

  /**
   * Expires all invitations (for testing expiration scenarios)
   */
  async expireAllInvitations() {
    await this.client.invitation.updateMany({
      data: {
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
      },
    });
  }

  /**
   * Expires specific invitations by ID
   */
  async expireInvitations(invitationIds: number[]) {
    await this.client.invitation.updateMany({
      where: {
        id: { in: invitationIds },
      },
      data: {
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
      },
    });
  }

  /**
   * Gets invitation statistics for a workspace
   */
  async getWorkspaceInvitationStats(workspaceId: number) {
    const [pending, accepted, declined, expired] = await Promise.all([
      this.client.invitation.count({
        where: { workspaceId, status: InvitationStatus.PENDING },
      }),
      this.client.invitation.count({
        where: { workspaceId, status: InvitationStatus.ACCEPTED },
      }),
      this.client.invitation.count({
        where: { workspaceId, status: InvitationStatus.DECLINED },
      }),
      this.client.invitation.count({
        where: {
          workspaceId,
          expiresAt: { lt: new Date() },
          status: InvitationStatus.PENDING,
        },
      }),
    ]);

    return {
      pending,
      accepted,
      declined,
      expired,
      total: pending + accepted + declined,
    };
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  async findUserByEmail(email: string): Promise<UserWithAccount | null> {
    return this.client.user.findFirst({
      where: {
        accounts: {
          some: { email },
        },
      },
      include: {
        accounts: true,
      },
    });
  }

  async findWorkspaceBySlug(slug: string) {
    return this.client.workspace.findUnique({
      where: { slug },
      include: {
        members: {
          include: {
            user: {
              include: {
                accounts: true,
              },
            },
          },
        },
        configuration: true,
      },
    });
  }

  // ============================================================================
  // Complex Scenario Builders
  // ============================================================================

  /**
   * Creates a complete workspace scenario with teacher and students
   */
  async createWorkspaceScenario(
    options: {
      teacherCount?: number;
      studentCount?: number;
      workspaceOverrides?: Partial<CreateWorkspaceOptions>;
    } = {},
  ) {
    const {
      teacherCount = 1,
      studentCount = 3,
      workspaceOverrides = {},
    } = options;

    // Create owner
    const owner = await this.createMockUser();

    // Create teachers
    const teachers = [];
    for (let i = 0; i < teacherCount; i++) {
      teachers.push(await this.createMockUser());
    }

    // Create students
    const students = [];
    for (let i = 0; i < studentCount; i++) {
      students.push(await this.createMockUser());
    }

    // Create workspace with all members
    const members = [
      { user: owner.user, roles: [WorkspaceRole.OWNER] },
      ...teachers.map((t) => ({
        user: t.user,
        roles: [WorkspaceRole.TEACHER],
      })),
      ...students.map((s) => ({
        user: s.user,
        roles: [WorkspaceRole.STUDENT],
      })),
    ];

    const { workspace } = await this.createWorkspace(owner.user.id, {
      members,
      ...workspaceOverrides,
    });

    return {
      workspace,
      owner,
      teachers,
      students,
      allUsers: [owner, ...teachers, ...students],
    };
  }

  /**
   * Creates a complete event scenario with organizers and attendees
   */
  async createEventScenario(
    workspaceId: number,
    createdByUserId: number,
    options: {
      attendeeCount?: number;
      eventOverrides?: Partial<CreateEventOptions>;
    } = {},
  ) {
    const { attendeeCount = 5, eventOverrides = {} } = options;

    // Create event
    const event = await this.createEvent(
      createdByUserId,
      workspaceId,
      eventOverrides,
    );

    // Create attendees
    const attendees = [];
    for (let i = 0; i < attendeeCount; i++) {
      const user = await this.createMockUser();
      const attendee = await this.client.attendee.create({
        data: {
          eventId: event.id,
          userId: user.user.id,
          historyEntries: {
            create: {
              action: 'REGISTERED',
              performedById: user.user.id,
            },
          },
        },
        include: {
          user: {
            include: {
              accounts: true,
            },
          },
          historyEntries: {
            include: {
              performedBy: true,
            },
          },
        },
      });
      attendees.push({ attendee, password: user.password });
    }

    return {
      event,
      attendees,
    };
  }
}
