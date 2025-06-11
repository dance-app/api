import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AttendanceAction, DanceRole, EventVisibility } from '@prisma/client';

import { PublicUserDto } from '@/user/dto/public-user.dto';
import { WorkspaceDto } from '@/workspace/dto';

export class EventOrganizerDto {
  @ApiProperty({ description: 'Organizer ID' })
  id: number;

  @ApiProperty({ description: 'User ID' })
  userId: number;

  @ApiProperty({ description: 'User details', type: PublicUserDto })
  user: PublicUserDto;
}

export class EventCapacityDto {
  @ApiProperty({ description: 'Minimum capacity' })
  capacityMin?: number;

  @ApiProperty({ description: 'Maximum capacity' })
  capacityMax?: number;

  @ApiProperty({ description: 'Leader offset for dance roles' })
  leaderOffset: number;

  @ApiProperty({ description: 'Follower offset for dance roles' })
  followerOffset: number;

  @ApiProperty({ description: 'Current attendee count' })
  attendeeCount: number;

  @ApiProperty({ description: 'Confirmed attendees count' })
  confirmedAttendeeCount: number;

  @ApiProperty({ description: 'Available spots remaining' })
  availableSpots?: number;

  @ApiProperty({ description: 'Is the event at capacity' })
  isAtCapacity: boolean;
}

export class EventScheduleDto {
  @ApiProperty({ description: 'Event start date and time' })
  dateStart: Date;

  @ApiProperty({ description: 'Event end date and time' })
  dateEnd?: Date;

  @ApiProperty({ description: 'Event location' })
  location?: string;

  @ApiProperty({ description: 'Event timezone' })
  timezone?: string;

  @ApiProperty({ description: 'Duration in minutes' })
  durationMinutes?: number;
}

export class EventRecurrenceDto {
  @ApiProperty({ description: 'iCalendar RRULE string' })
  rrule?: string;

  @ApiProperty({ description: 'Parent event ID for recurring events' })
  parentEventId?: number;

  @ApiProperty({ description: 'Is this a recurring event or part of a series' })
  isRecurring: boolean;

  @ApiProperty({ description: 'Is this the parent/master event of a series' })
  isParentEvent: boolean;

  @ApiProperty({ description: 'Total number of events in series' })
  seriesCount?: number;
}

export class EventStatusDto {
  @ApiProperty({ description: 'Is the event cancelled' })
  isCancelled: boolean;

  @ApiProperty({ description: 'When the event was cancelled' })
  cancelledAt?: Date;

  @ApiProperty({ description: 'Cancellation reason' })
  cancellationReason?: string;

  @ApiProperty({
    description: 'Event visibility',
    enum: EventVisibility,
    example: 'WORKSPACE_ONLY',
  })
  visibility: EventVisibility;

  @ApiProperty({ description: 'Is the event public' })
  isPublic: boolean;
}

export class EventPermissionsDto {
  @ApiProperty({ description: 'Can the current user edit this event' })
  canEdit: boolean;

  @ApiProperty({ description: 'Can the current user cancel this event' })
  canCancel: boolean;

  @ApiProperty({ description: 'Can the current user attend this event' })
  canAttend: boolean;

  @ApiProperty({ description: 'Can the current user invite others' })
  canInvite: boolean;

  @ApiProperty({ description: 'Is the current user attending' })
  isAttending: boolean;

  @ApiProperty({ description: 'Current user attendance status' })
  userAttendanceStatus?: AttendanceAction; // last action serves as current status

  @ApiProperty({ description: 'Current user dance role preference' })
  userDanceRole?: DanceRole;
}

export class EventResponseDto {
  @ApiProperty({ description: 'Event ID' })
  id: number;

  @ApiProperty({ description: 'Event name' })
  name: string;

  @ApiProperty({ description: 'Event description' })
  description?: string;

  @ApiProperty({
    description: 'Event schedule information',
    type: EventScheduleDto,
  })
  schedule: EventScheduleDto;

  @ApiProperty({
    description: 'Event capacity and attendance',
    type: EventCapacityDto,
  })
  capacity: EventCapacityDto;

  @ApiProperty({
    description: 'Event recurrence information',
    type: EventRecurrenceDto,
  })
  recurrence: EventRecurrenceDto;

  @ApiProperty({
    description: 'Event status and visibility',
    type: EventStatusDto,
  })
  status: EventStatusDto;

  @ApiProperty({ description: 'Event organizers', type: [EventOrganizerDto] })
  organizers: EventOrganizerDto[];

  @ApiProperty({
    description: 'Workspace information',
    type: WorkspaceDto,
  })
  workspace: WorkspaceDto;

  @ApiProperty({
    description: 'User permissions for this event',
    type: EventPermissionsDto,
  })
  permissions?: EventPermissionsDto; // Optional, only included for authenticated users

  @ApiProperty({ description: 'Event creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Event last update timestamp' })
  updatedAt: Date;

  @ApiProperty({ description: 'Created by user', type: PublicUserDto })
  createdBy: PublicUserDto;
}

// event/dto/event-summary.dto.ts - Lighter version for lists
export class EventSummaryDto {
  @ApiProperty({ description: 'Event ID' })
  id: number;

  @ApiProperty({ description: 'Event name' })
  name: string;

  @ApiProperty({ description: 'Event start date and time' })
  dateStart: Date;

  @ApiProperty({ description: 'Event end date and time' })
  dateEnd?: Date;

  @ApiProperty({ description: 'Event location' })
  location?: string;

  @ApiProperty({ description: 'Is cancelled' })
  isCancelled: boolean;

  @ApiProperty({ description: 'Event visibility' })
  visibility: EventVisibility;

  @ApiProperty({ description: 'Confirmed attendees count' })
  confirmedAttendeeCount: number;

  @ApiProperty({ description: 'Maximum capacity' })
  capacityMax?: number;

  @ApiProperty({ description: 'Is recurring event' })
  isRecurring: boolean;

  @ApiProperty({ description: 'Workspace slug' })
  workspaceSlug: string;

  @ApiProperty({ description: 'Available spots' })
  availableSpots?: number;
}
