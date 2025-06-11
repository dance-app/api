// event/event.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
  UnauthorizedException,
  forwardRef,
  Inject,
} from '@nestjs/common';
import {
  EventVisibility,
  AttendanceAction,
  Prisma,
  Event,
  DanceRole,
  User,
  Attendee,
} from '@prisma/client';
import { RRule } from 'rrule';

import {
  CreateEventDto,
  UpdateEventDto,
  EventResponseDto,
  AttendEventDto,
  SearchEventsDto,
  CancelEventDto,
  AttendanceHistoryResponseDto,
  AttendeeResponseDto,
  EventPermissionsDto,
  EventSummaryDto,
} from './dto';
import {
  AttendeeWithUser,
  EventWithAttendees,
  EventWithWorkspace,
} from './types/event.type';

import { AuthService } from '@/auth/auth.service';
import { DatabaseService } from '@/database/database.service';
import { MemberResponseDto } from '@/member/dto/member-response.dto';
import { MemberService } from '@/member/member.service';
import { PaginationDto, PaginatedResponseDto } from '@/pagination/dto';
import { PaginationService } from '@/pagination/pagination.service';
import { UserWithAccount } from '@/user/user.types';

@Injectable()
export class EventService {
  private readonly logger = new Logger(EventService.name);

  constructor(
    private database: DatabaseService,
    private paginationService: PaginationService,
    private memberService: MemberService,
    private authService: AuthService,
  ) {}

  //==================
  // CREATE EVENTS
  //==================

  async createEvent(
    createEventDto: CreateEventDto,
    createdBy: UserWithAccount,
    workspaceId: number,
  ): Promise<EventResponseDto> {
    const { rrule, additionalOrganizerIds = [], ...eventData } = createEventDto;

    // Validate dates
    const startDate = new Date(createEventDto.dateStart);
    const endDate = createEventDto.dateEnd
      ? new Date(createEventDto.dateEnd)
      : null;

    if (endDate && endDate <= startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    const isRecurring = !!rrule;

    return this.database.$transaction(async (tx) => {
      // Create the main event
      const event = await tx.event.create({
        data: {
          ...eventData,
          dateStart: startDate,
          dateEnd: endDate,
          rrule: isRecurring ? rrule : null,
          visibility: createEventDto.visibility,
          createdById: createdBy.id,
          workspaceId,
          organizers: {
            create: [
              // Creator is always an organizer
              { userId: createdBy.id },
              // Additional organizers
              ...additionalOrganizerIds.map((userId) => ({ userId })),
            ],
          },
        },
        include: {
          organizers: {
            include: {
              user: true,
            },
          },
          workspace: true,
        },
      });

      // If recurring, create child events
      if (isRecurring && rrule) {
        await this.createRecurringEvents(
          tx,
          event,
          rrule,
          additionalOrganizerIds,
        );
      }

      return this.mapToEventResponseDto(event);
    });
  }

  private async createRecurringEvents(
    tx: Prisma.TransactionClient,
    parentEvent: Event,
    rruleString: string,
    additionalOrganizerIds: number[],
  ): Promise<void> {
    try {
      // Parse the RRULE
      const rule = RRule.fromString(rruleString);
      const startDate = new Date(parentEvent.dateStart);

      // Generate occurrences (limit to reasonable amount, e.g., 2 years or 100 events)
      const occurrences = rule.between(
        startDate,
        new Date(
          startDate.getFullYear() + 2,
          startDate.getMonth(),
          startDate.getDate(),
        ),
        true, // include start date
      );

      // Skip the first occurrence as it's the parent event
      const childOccurrences = occurrences.slice(1);

      if (childOccurrences.length > 100) {
        // Limit to prevent too many events
        childOccurrences.splice(100);
      }

      for (const occurrence of childOccurrences) {
        const duration = parentEvent.dateEnd
          ? new Date(parentEvent.dateEnd).getTime() -
            new Date(parentEvent.dateStart).getTime()
          : null;

        const childEventEnd = duration
          ? new Date(occurrence.getTime() + duration)
          : null;

        await tx.event.create({
          data: {
            name: parentEvent.name,
            description: parentEvent.description,
            dateStart: occurrence,
            dateEnd: childEventEnd,
            location: parentEvent.location,
            capacityMin: parentEvent.capacityMin,
            capacityMax: parentEvent.capacityMax,
            leaderOffset: parentEvent.leaderOffset,
            followerOffset: parentEvent.followerOffset,
            visibility: parentEvent.visibility,
            parentEventId: parentEvent.id,
            createdById: parentEvent.createdById,
            workspaceId: parentEvent.workspaceId,
            organizers: {
              create: [
                { userId: parentEvent.createdById },
                ...additionalOrganizerIds.map((userId) => ({ userId })),
              ],
            },
          },
        });
      }
    } catch (error) {
      this.logger.error('Failed to create recurring events', error);
      throw new BadRequestException('Invalid RRULE format');
    }
  }

  //==================
  // READ EVENTS
  //==================

  async getWorkspaceEvents(
    workspaceId: number,
    searchDto: SearchEventsDto,
    paginationDto: PaginationDto,
    user?: UserWithAccount,
  ): Promise<PaginatedResponseDto<EventResponseDto>> {
    const paginationOptions =
      this.paginationService.extractPaginationOptions(paginationDto);

    const where: Prisma.EventWhereInput = {
      workspaceId,
      ...this.buildSearchWhereClause(searchDto),
    };

    // Apply visibility filters based on user
    if (!user) {
      // Public access only
      where.visibility = EventVisibility.PUBLIC;
    } else {
      // Check if user is workspace member for WORKSPACE_ONLY events
      const member = await this.memberService.getMemberByUserId(
        user.id,
        workspaceId,
      );
      if (!member) {
        where.visibility = EventVisibility.PUBLIC;
      }
      // If user is member, they can see PUBLIC and WORKSPACE_ONLY events
      // INVITATION_ONLY events are handled separately
    }

    const [events, totalCount] = await Promise.all([
      this.database.event.findMany({
        where,
        include: {
          organizers: {
            include: {
              user: true,
            },
          },
          workspace: true,
          attendees: {
            include: {
              historyEntries: true,
              user: true,
            },
          },
        },
        orderBy: { dateStart: 'asc' },
        ...paginationOptions,
      }),
      this.database.event.count({ where }),
    ]);

    const eventDtos = events.map((event) => this.mapToEventResponseDto(event));

    return this.paginationService.createPaginatedResponse(
      eventDtos,
      totalCount,
      paginationDto,
    );
  }

  async getEventById(eventId: number): Promise<EventWithAttendees> {
    const event = await this.findEventById(eventId);

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    return event;
  }

  async getEventDtoById(eventId: number): Promise<EventResponseDto> {
    const event = await this.getEventById(eventId);
    return this.mapToEventResponseDto(event);
  }

  async getEventByIdForUser(
    eventId: number,
    user?: UserWithAccount,
  ): Promise<EventResponseDto> {
    const event = await this.findEventById(eventId);

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    // Check visibility permissions
    await this.checkEventVisibility(event, user);

    return this.mapToEventResponseDto(event);
  }

  private buildSearchWhereClause(
    searchDto: SearchEventsDto,
  ): Prisma.EventWhereInput {
    const where: Prisma.EventWhereInput = {};

    if (searchDto.search) {
      where.OR = [
        { name: { contains: searchDto.search, mode: 'insensitive' } },
        { description: { contains: searchDto.search, mode: 'insensitive' } },
        { location: { contains: searchDto.search, mode: 'insensitive' } },
      ];
    }

    if (searchDto.visibility) {
      where.visibility = searchDto.visibility;
    }

    where.dateStart = {};
    if (searchDto.dateFrom) {
      where.dateStart = { gte: new Date(searchDto.dateFrom) };
    }

    if (searchDto.dateTo) {
      where.dateStart = { ...where.dateStart, lte: new Date(searchDto.dateTo) };
    }

    if (!searchDto.includeCancelled) {
      where.isCancelled = false;
    }

    if (searchDto.organizerId) {
      where.organizers = {
        some: { userId: searchDto.organizerId },
      };
    }

    return where;
  }

  //==================
  // READ ATTENDEES
  //==================

  async getAttendeeByUserId(userId: number, eventId: number) {
    const attendee = await this.database.attendee.findFirst({
      where: {
        userId,
        eventId,
      },
    });
    return attendee;
  }

  async getAttendeeByEmail(email: string, eventId: number) {
    const attendee = await this.database.attendee.findFirst({
      where: {
        guestEmail: email,
        eventId,
      },
    });
    return attendee;
  }

  async findAttendeeByUserId(userId: number, eventId: number) {
    const attendee = await this.getAttendeeByUserId(userId, eventId);
    if (!!attendee) {
      throw new NotFoundException('Attendee does not exist.');
    }
    return attendee;
  }

  //==================
  // UPDATE EVENTS
  //==================

  async updateEvent(
    eventId: number,
    updateEventDto: UpdateEventDto,
    user: UserWithAccount,
  ): Promise<EventResponseDto> {
    const event = await this.findEventById(eventId);

    // Check if user is organizer
    await this.checkEventOrganizerPermission(event, user);

    const { additionalOrganizerIds, ...updateData } = updateEventDto;

    // Validate dates if provided
    if (updateEventDto.dateStart || updateEventDto.dateEnd) {
      const startDate = updateEventDto.dateStart
        ? new Date(updateEventDto.dateStart)
        : event.dateStart;
      const endDate = updateEventDto.dateEnd
        ? new Date(updateEventDto.dateEnd)
        : event.dateEnd;

      if (endDate && endDate <= startDate) {
        throw new BadRequestException('End date must be after start date');
      }
    }

    return this.database.$transaction(async (tx) => {
      // Determine which events to update
      const eventsToUpdate = event.parentEventId
        ? await this.getFutureSeriesEvents(
            tx,
            event.parentEventId,
            event.dateStart,
          )
        : [event.id];

      // Update events
      await tx.event.updateMany({
        where: { id: { in: eventsToUpdate } },
        data: {
          ...updateData,
          dateStart: updateEventDto.dateStart,
          dateEnd: updateEventDto.dateEnd,
          visibility: updateEventDto.visibility,
        },
      });

      // Update organizers if provided
      if (additionalOrganizerIds !== undefined) {
        for (const eventIdToUpdate of eventsToUpdate) {
          await this.addEventOrganizers(
            tx,
            eventIdToUpdate,
            additionalOrganizerIds,
          );
        }
      }

      // Return updated event
      const updatedEvent = await tx.event.findUnique({
        where: { id: eventId },
        include: {
          organizers: {
            include: {
              user: true,
            },
          },
          workspace: true,
          attendees: {
            include: {
              historyEntries: true,
            },
          },
        },
      });

      return this.mapToEventResponseDto(updatedEvent);
    });
  }

  private async addEventOrganizers(
    tx: Prisma.TransactionClient,
    eventId: number,
    organizerIds: number[],
  ) {
    await tx.eventOrganizer.createMany({
      data: organizerIds.map((userId) => ({
        eventId,
        userId,
      })),
      skipDuplicates: true,
    });
  }
  private async updateEventOrganizers(
    tx: Prisma.TransactionClient,
    eventId: number,
    organizerIds: number[],
    creatorId: number,
  ): Promise<void> {
    // Delete existing organizers (except creator)
    await tx.eventOrganizer.deleteMany({
      where: {
        eventId,
        userId: { not: creatorId },
      },
    });

    // Add new organizers
    if (organizerIds.length > 0) {
      await this.addEventOrganizers(tx, eventId, organizerIds);
    }
  }

  //==================
  // CANCEL EVENTS
  //==================

  async cancelEvent(
    eventId: number,
    cancelEventDto: CancelEventDto,
    user: UserWithAccount,
  ): Promise<EventResponseDto> {
    const event = await this.findEventById(eventId);

    // Check if user is organizer
    await this.checkEventOrganizerPermission(event, user);

    if (event.isCancelled) {
      throw new BadRequestException('Event is already cancelled');
    }

    //const { reason } = cancelEventDto;

    return this.database.$transaction(async (tx) => {
      // Determine which events to cancel
      const eventsToCancel = event.parentEventId
        ? await this.getFutureSeriesEvents(
            tx,
            event.parentEventId,
            event.dateStart,
          )
        : [event.id];

      // Cancel events
      await tx.event.updateMany({
        where: { id: { in: eventsToCancel } },
        data: {
          isCancelled: true,
          cancelledAt: new Date(),
        },
      });

      // Record attendance history for all current attendees
      for (const eventIdToCancel of eventsToCancel) {
        const attendeesWithLatestHistory = await tx.attendee.findMany({
          where: {
            eventId: eventId,
          },
          include: {
            historyEntries: {
              orderBy: {
                createdAt: 'desc',
              },
              take: 1,
            },
          },
        });
        const notCancelledAttendees = attendeesWithLatestHistory.filter(
          (a) =>
            a.historyEntries &&
            a.historyEntries[0].action !== AttendanceAction.CANCELLED,
        );

        // Create history records for cancelled attendances
        await tx.attendanceHistory.createMany({
          data: notCancelledAttendees.map((attendee) => ({
            eventId: eventIdToCancel,
            attendeeId: attendee.id,
            action: AttendanceAction.CANCELLED,
            performedById: user.id,
            notes: `Event cancelled: ${cancelEventDto.reason || 'No reason provided'}`,
          })),
        });
      }

      // Return updated event
      const updatedEvent = await tx.event.findUnique({
        where: { id: eventId },
        include: {
          organizers: {
            include: {
              user: true,
            },
          },
          workspace: true,
          attendees: {
            include: { historyEntries: true },
          },
        },
      });

      return this.mapToEventResponseDto(updatedEvent);
    });
  }

  //==================
  // ATTENDANCE MANAGEMENT
  //==================

  private async addAttendee(
    event: Event,
    creator: UserWithAccount,
    attendeeUser: UserWithAccount | undefined,
    guestEmail: string | undefined,
    guestName: string | undefined,
    attendSeries: boolean,
    role: DanceRole,
    status: AttendanceAction = AttendanceAction.REGISTERED,
  ): Promise<Attendee[]> {
    let attendees = await this.database.$transaction(async (tx) => {
      const attendees = [];
      const eventsToAttend =
        attendSeries && event.parentEventId
          ? await this.getFutureSeriesEvents(
              tx,
              event.parentEventId,
              event.dateStart,
            )
          : [event.id];

      for (const eventIdToAttend of eventsToAttend) {
        attendees.push(
          await this.updateAttendanceWithHistory(
            tx,
            eventIdToAttend,
            creator.id,
            attendeeUser.id,
            guestEmail,
            guestName,
            role,
            status,
          ),
        );
      }
      return attendees;
    });
    attendees = await this.getAttendeesByIds(
      attendees.map((a) => a.id),
      true,
    );
    return attendees;
  }

  async checkUserCanRegisterNewAttendee(
    event: EventWithWorkspace,
    creator: UserWithAccount,
    attendeeUser?: UserWithAccount,
    guestEmail?: string,
  ) {
    const isCreatorOrganizer = this.isUserOrgnanizer(event, creator);
    // For invitation only events: only the organizers can create attendences
    // Attendee can only update (confirm / reject) their attendence
    if (event.visibility === EventVisibility.INVITATION_ONLY) {
      if (!isCreatorOrganizer) {
        throw new UnauthorizedException('Not an organizer');
      } else {
        return true;
      }
    }
    // For public events: anyone can register himself
    // Only organizers can register other users. Maybe later, anyon can send an invite to anyone else
    else if (event.visibility === EventVisibility.PUBLIC) {
      if (!!attendeeUser && attendeeUser.id === creator.id) {
        return true; // user register himself
      } else if (isCreatorOrganizer && !!guestEmail) {
        return true; // organizer can register anyone
      } else {
        if (isCreatorOrganizer) {
          throw new BadRequestException(
            'At least one of attendee user or guest emai should be specified',
          );
        } else {
          throw new UnauthorizedException('Not an organizer');
        }
      }
    }
    // For workspace events: members can register themselves
    // Only organizers can register other users
    else if (event.visibility === EventVisibility.WORKSPACE_ONLY) {
      if (!attendeeUser) {
        throw new UnauthorizedException('Not a member'); // Only members can attend the event
      }
      const member = await this.memberService.getMemberByUserId(
        attendeeUser.id,
        event.workspaceId,
      );
      if (!member) {
        throw new UnauthorizedException('Not a member'); // Only members can attend the event
      }
      return true;
    } else {
      // Shouldn't happen
      throw Error(
        `Unexpected error: Event visibility is '${event.visibility}'`,
      );
    }
  }
  async createAttendee(
    event: EventWithWorkspace,
    creator: UserWithAccount,
    attendeeUser: UserWithAccount | undefined,
    guestEmail: string | undefined,
    guestName: string | undefined,
    attendSeries: boolean,
    role: DanceRole,
  ) {
    await this.checkUserCanRegisterNewAttendee(
      event,
      creator,
      attendeeUser,
      guestEmail,
    );
    const attendees = await this.addAttendee(
      event,
      creator,
      attendeeUser,
      guestEmail,
      guestName,
      attendSeries,
      role,
    );
    return attendees.map((a) => this.mapToAttendeeResponseDto(a));
  }

  async attendEvent(
    eventId: number,
    attendEventDto: AttendEventDto,
    user: UserWithAccount | undefined,
    workspaceId: number,
  ): Promise<void> {
    const event = await this.findEventById(eventId);

    const attendee = await this.findAttendeeByUserId(user.id, eventId);

    // Check if event is in the correct workspace
    if (event.workspaceId !== workspaceId) {
      throw new NotFoundException('Event not found in this workspace');
    }

    // Check event visibility and access
    await this.checkEventVisibility(event, user);

    if (event.isCancelled) {
      throw new BadRequestException('Cannot attend a cancelled event');
    }

    await this.database.$transaction(async (tx) => {
      const eventsToAttend = event.parentEventId
        ? await this.getFutureSeriesEvents(
            tx,
            event.parentEventId,
            event.dateStart,
          )
        : [event.id];

      for (const eventIdToAttend of eventsToAttend) {
        await this.updateAttendanceWithHistory(
          tx,
          eventIdToAttend,
          user.id,
          attendee.userId,
          attendee.guestEmail,
          attendee.guestName,
          attendEventDto.role || attendee.role,
          attendEventDto.action,
        );
      }
    });
  }

  private async upsertAttendeeByEmail(
    eventId: number,
    email: string,
    name?: string,
    role?: DanceRole,
    tx: Prisma.TransactionClient | undefined = undefined,
  ) {
    let attendee = await this.getAttendeeByEmail(email, eventId);
    if (!attendee) {
      attendee = await (tx || this.database).attendee.upsert({
        where: {
          id: attendee?.id,
        },
        create: {
          eventId,
          role,
          guestEmail: email,
          guestName: name,
        },
        update: {
          role,
          guestName: name,
        },
      });
    }
    return attendee;
  }
  private async upsertAttendeeByUserId(
    eventId: number,
    userId?: number,
    role?: DanceRole,
    tx: Prisma.TransactionClient | undefined = undefined,
  ) {
    let attendee = await this.getAttendeeByUserId(userId, eventId);

    attendee = await (tx || this.database).attendee.upsert({
      where: {
        id: attendee?.id || -1,
      },
      create: {
        eventId,
        role,
        userId,
      },
      update: {
        role,
      },
    });
    return attendee;
  }

  private async upsertAttendee(
    eventId: number,
    userId?: number,
    email?: string,
    name?: string,
    role?: DanceRole,
    tx: Prisma.TransactionClient | undefined = undefined,
  ) {
    if (userId !== undefined) {
      return await this.upsertAttendeeByUserId(eventId, userId, role, tx);
    } else if (email !== undefined) {
      return await this.upsertAttendeeByEmail(eventId, email, name, role, tx);
    } else {
      throw new Error('One of userId or email should be provided.');
    }
  }

  private async getAttendeeById(
    attendeeId: number,
    withHistory: boolean = false,
  ) {
    return this.database.attendee.findUnique({
      where: { id: attendeeId },
      include: {
        user: {
          include: {
            accounts: true,
          },
        },
        historyEntries: withHistory,
      },
    });
  }

  private async getAttendeesByIds(
    attendeeIds: number[],
    withHistory: boolean = false,
  ) {
    return this.database.attendee.findMany({
      where: { id: { in: attendeeIds } },
      include: {
        user: {
          include: {
            accounts: true,
          },
        },
        historyEntries: withHistory,
      },
    });
  }
  // Core method that handles both current state and history consistently
  private async updateAttendanceWithHistory(
    tx: Prisma.TransactionClient,
    eventId: number,
    performedById: number,
    userId?: number,
    email?: string,
    name?: string,
    role?: DanceRole,
    action: AttendanceAction = AttendanceAction.REGISTERED,
  ): Promise<Attendee> {
    const attendee = await this.upsertAttendee(
      eventId,
      userId,
      email,
      name,
      role,
      tx,
    );
    const latestChange = await this.database.attendanceHistory.findFirst({
      where: {
        attendeeId: attendee.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    if (
      !latestChange ||
      latestChange.action !== action ||
      latestChange.performedById !== performedById
    ) {
      // Create history entry
      await tx.attendanceHistory.create({
        data: {
          attendeeId: attendee.id,
          action,
          performedById,
        },
      });
    }
    return attendee;
  }
  /*
  // Query methods for different use cases
  async getCurrentAttendees(eventId: number): Promise<any[]> {
    // Fast query using current state
    return this.database.attendee.findMany({
      where: {
        eventId,
        status: { not: AttendanceStatus.CANCELLED },
      },
      include: {
        member: {
          include: { user: true },
        },
      },
    });
  }

  async getAttendanceHistory(
    eventId: number,
    memberId?: number,
  ): Promise<any[]> {
    // Full history query
    return this.database.attendanceHistory.findMany({
      where: {
        eventId,
        ...(memberId && { memberId }),
      },
      include: {
        member: {
          include: { user: true },
        },
        performedBy: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAttendanceAtDate(eventId: number, date: Date): Promise<any[]> {
    // Point-in-time query using history
    const memberIds = await this.database.attendanceHistory.groupBy({
      by: ['memberId'],
      where: {
        eventId,
        createdAt: { lte: date },
      },
    });

    const attendeesAtDate = [];

    for (const { memberId } of memberIds) {
      const latestStatus = await this.database.attendanceHistory.findFirst({
        where: {
          eventId,
          memberId,
          createdAt: { lte: date },
        },
        orderBy: { createdAt: 'desc' },
        include: {
          member: {
            include: { user: true },
          },
        },
      });

      if (
        latestStatus &&
        latestStatus.newStatus !== AttendanceStatus.CANCELLED
      ) {
        attendeesAtDate.push({
          memberId,
          status: latestStatus.newStatus,
          role: latestStatus.newRole,
          member: latestStatus.member,
        });
      }
    }

    return attendeesAtDate;
  }

  async getEventAttendanceHistory(
    eventId: number,
    user: UserWithAccount,
    memberId?: number,
  ): Promise<AttendanceHistoryResponseDto[]> {
    const event = await this.findEventById(eventId);
    await this.checkEventOrganizerPermission(event, user);

    const history = await this.database.attendanceHistory.findMany({
      where: {
        eventId,
        ...(memberId && { memberId }),
      },
      include: {
        attendee: {
          include: { member: true },
        },
        performedBy: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return history.map((entry) =>
      this.mapToAttendanceHistoryResponseDto(entry),
    );
  }

  async getEventAttendees(
    eventId: number,
    user?: UserWithAccount,
  ): Promise<AttendeeResponseDto[]> {
    const event = await this.findEventById(eventId);
    await this.checkEventVisibility(event, user);

    const attendees = await this.database.attendee.findMany({
      where: {
        attendanceHistory: {
          eventId,
        },
        status: { not: AttendanceStatus.CANCELLED },
      },
      include: {
        member: {
          include: { user: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return attendees.map((attendee) => this.mapToAttendeeResponseDto(attendee));
  }
  */
  //==================
  // HELPER METHODS
  //==================

  async findEventById(eventId: number): Promise<EventWithAttendees> {
    const event = await this.database.event.findUnique({
      where: { id: eventId },
      include: {
        organizers: {
          include: {
            user: true,
          },
        },
        workspace: true,
        attendees: {
          include: {
            historyEntries: true,
            user: true,
          },
        },
        createdBy: true,
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    return event;
  }

  private async checkEventVisibility(
    event: EventWithAttendees,
    user?: UserWithAccount,
  ): Promise<void> {
    if (event.visibility === EventVisibility.PUBLIC) {
      return; // Everyone can see public events
    }

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    if (event.visibility === EventVisibility.WORKSPACE_ONLY) {
      // Check if user is workspace member
      const member = await this.memberService.getMemberByUserId(
        user.id,
        event.workspaceId,
      );

      if (!member) {
        throw new ForbiddenException('Access denied');
      }
    } else if (event.visibility === EventVisibility.INVITATION_ONLY) {
      // Check if user is organizer or has invitation
      const isOrganizer = this.isUserOrgnanizer(event, user);

      if (!isOrganizer) {
        const hasInvitation = await this.database.invitation.findFirst({
          where: {
            eventId: event.id,
            inviteeId: user.id,
            status: 'PENDING',
          },
        });

        if (!hasInvitation) {
          throw new ForbiddenException('Access denied');
        }
      }
    }
  }

  isUserOrgnanizer(event: EventWithWorkspace, user: User) {
    return event.organizers.some((org) => org.userId === user.id);
  }
  private async checkEventOrganizerPermission(
    event: EventWithWorkspace,
    user: UserWithAccount,
  ): Promise<void> {
    const isOrganizer = this.isUserOrgnanizer(event, user);

    if (!isOrganizer) {
      throw new ForbiddenException(
        'Only event organizers can perform this action',
      );
    }
  }

  private async getFutureSeriesEvents(
    tx: Prisma.TransactionClient,
    parentEventId: number,
    fromDate: Date,
  ): Promise<number[]> {
    const events = await tx.event.findMany({
      where: {
        OR: [
          { id: parentEventId },
          { parentEventId, dateStart: { gte: fromDate } },
        ],
      },
      select: { id: true },
      orderBy: { dateStart: 'asc' },
    });

    return events.map((e) => e.id);
  }

  private mapToEventResponseDto(
    event: any,
    user?: UserWithAccount,
  ): EventResponseDto {
    const duration =
      event.dateEnd && event.dateStart
        ? Math.round(
            (new Date(event.dateEnd).getTime() -
              new Date(event.dateStart).getTime()) /
              (1000 * 60),
          )
        : undefined;

    const availableSpots = event.capacityMax
      ? Math.max(0, event.capacityMax - (event._count?.attendees || 0))
      : undefined;

    return {
      id: event.id,
      name: event.name,
      description: event.description,

      schedule: {
        dateStart: event.dateStart,
        dateEnd: event.dateEnd,
        location: event.location,
        timezone: 'UTC', // You might want to store this in the event or derive from workspace
        durationMinutes: duration,
      },

      capacity: {
        capacityMin: event.capacityMin,
        capacityMax: event.capacityMax,
        leaderOffset: event.leaderOffset || 0,
        followerOffset: event.followerOffset || 0,
        attendeeCount: event._count?.attendees || 0,
        confirmedAttendeeCount: event._count?.confirmedAttendees || 0,
        availableSpots,
        isAtCapacity: event.capacityMax
          ? (event._count?.attendees || 0) >= event.capacityMax
          : false,
      },

      recurrence: {
        rrule: event.rrule,
        parentEventId: event.parentEventId,
        isRecurring: !!event.rrule || !!event.parentEventId,
        isParentEvent: !!event.rrule && !event.parentEventId,
        seriesCount: event.childEvents?.length || undefined,
      },

      status: {
        isCancelled: event.isCancelled,
        cancelledAt: event.cancelledAt,
        cancellationReason: event.cancellationReason,
        visibility: event.visibility,
        isPublic: event.isPublic,
      },

      organizers: (event.organizers || []).map((org) => ({
        id: org.id,
        userId: org.userId,
        role: org.role,
        user: {
          id: org.user.id,
          firstName: org.user.firstName || '',
          lastName: org.user.lastName || '',
        },
      })),

      workspace: {
        name: event.workspace?.name || '',
        slug: event.workspace?.slug || '',
      },

      createdBy: {
        id: event.createdBy?.id || event.createdById,
        firstName: event.createdBy?.firstName || '',
        lastName: event.createdBy?.lastName || '',
      },

      // Include permissions only for authenticated users
      permissions: user
        ? this.calculateEventPermissions(event, user)
        : undefined,

      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    };
  }

  private mapToEventSummaryDto(event: any): EventSummaryDto {
    const availableSpots = event.capacityMax
      ? Math.max(0, event.capacityMax - (event._count?.attendees || 0))
      : undefined;

    return {
      id: event.id,
      name: event.name,
      dateStart: event.dateStart,
      dateEnd: event.dateEnd,
      location: event.location,
      isCancelled: event.isCancelled,
      visibility: event.visibility,
      confirmedAttendeeCount: event._count?.confirmedAttendees || 0,
      capacityMax: event.capacityMax,
      isRecurring: !!event.rrule || !!event.parentEventId,
      workspaceSlug: event.workspace?.slug || '',
      availableSpots,
    };
  }

  private calculateEventPermissions(
    event: EventWithWorkspace,
    user: UserWithAccount,
  ): EventPermissionsDto {
    const isOrganizer = this.isUserOrgnanizer(event, user);
    const isCreator = event.createdById === user.id;

    return {
      canEdit: isOrganizer || isCreator || user.isSuperAdmin,
      canCancel: isOrganizer || isCreator || user.isSuperAdmin,
      canAttend: this.canUserAttendEvent(event, user),
      canInvite: isOrganizer || isCreator,
      isAttending: false, //TODO
      userAttendanceStatus: undefined, //TODO
      userDanceRole: undefined, // TODO
    };
  }

  private canUserAttendEvent(event: any, user: UserWithAccount): boolean {
    if (event.isCancelled) return false;
    if (event.visibility === EventVisibility.PUBLIC) return true;

    // For workspace and invitation-only events, you'll need to check membership/invitations
    return true; // Simplified for now
  }

  private mapToAttendeeResponseDto(
    attendee: Attendee | AttendeeWithUser,
  ): AttendeeResponseDto {
    return {
      id: attendee.id,
      user:
        'user' in attendee
          ? this.authService.mapToSafeUser(attendee.user, [])
          : undefined,
      role: attendee.role,
      guestEmail: attendee.guestEmail,
      guestName: attendee.guestName,
      // TODO
      //history: attendee.historyEntries,
      status:
        'historyEntries' in attendee
          ? attendee.historyEntries[attendee.historyEntries.length - 1].action
          : undefined,
      createdAt: attendee.createdAt,
      updatedAt: attendee.updatedAt,
      wasInvited: 'invitation' in attendee ? !!attendee.invitation : undefined,
    };
  }

  // Method to map attendance history
  private mapToAttendanceHistoryResponseDto(
    history: any,
  ): AttendanceHistoryResponseDto {
    return {
      id: history.id,
      eventId: history.eventId,
      member: this.memberService.mapToMemberResponseDto(history.member),
      action: history.action,
      previousRole: history.previousRole,
      newRole: history.newRole,
      performedBy: {
        id: history.performedBy.id,
        firstName: history.performedBy.firstName || '',
        lastName: history.performedBy.lastName || '',
      },
      notes: history.notes,
      createdAt: history.createdAt,
      metadata: history.metadata,
    };
  }
}
