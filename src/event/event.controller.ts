import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
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

import { EventById } from './decorator/event.decorator';
import {
  CreateEventDto,
  UpdateEventDto,
  EventResponseDto,
  AttendEventDto,
  SearchEventsDto,
  CancelEventDto,
  AttendeeResponseDto,
} from './dto';
import { CreateAttendeeDto } from './dto/create-attendee.dto';
import { EventService } from './event.service';
import { EventWithWorkspace } from './types/event.type';

import { GetAuthUser } from '@/auth/decorator';
import { JwtGuard } from '@/auth/guard';
import { GetPagination } from '@/pagination/decorator';
import { PaginatedResponseDto, PaginationDto } from '@/pagination/dto';
import { UserService } from '@/user/user.service';
import { UserWithAccount } from '@/user/user.types';
import { WorkspaceBySlug } from '@/workspace/decorator/workspace.decorator';
import {
  CanViewWorkspaceGuard,
  RequireWorkspaceRoles,
  WorkspaceRolesGuard,
} from '@/workspace/guard';

@ApiTags('events')
@Controller('workspace/:slug/events')
@ApiParam({
  name: 'slug',
  type: 'string',
  description: 'Workspace slug identifier',
  example: 'studio-a',
})
export class EventController {
  constructor(
    private eventService: EventService,
    private userService: UserService,
  ) {}

  @Post()
  @UseGuards(JwtGuard, CanViewWorkspaceGuard, WorkspaceRolesGuard)
  @RequireWorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.TEACHER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new event' })
  @ApiResponse({
    status: 201,
    description: 'Event created successfully',
    type: EventResponseDto,
  })
  async createEvent(
    @GetAuthUser() user: UserWithAccount,
    @WorkspaceBySlug() workspace: Workspace,
    @Body() createEventDto: CreateEventDto,
  ): Promise<EventResponseDto> {
    console.log('hello');
    return this.eventService.createEvent(createEventDto, user, workspace.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get workspace events' })
  @ApiResponse({
    status: 200,
    description: 'List of events',
    type: PaginatedResponseDto<EventResponseDto>,
  })
  async getWorkspaceEvents(
    @WorkspaceBySlug() workspace: Workspace,
    @GetAuthUser() user: UserWithAccount | undefined,
    @Query() searchDto: SearchEventsDto,
    @GetPagination() paginationDto: PaginationDto,
  ): Promise<PaginatedResponseDto<EventResponseDto>> {
    console.log(workspace);
    return this.eventService.getWorkspaceEvents(
      workspace.id,
      searchDto,
      paginationDto,
      user,
    );
  }

  @Get(':id')
  //@UseGuards(OptionalJwtGuard)
  @ApiOperation({ summary: 'Get event by ID' })
  @ApiParam({ name: 'id', description: 'Event ID' })
  @ApiResponse({
    status: 200,
    description: 'Event details',
    type: EventResponseDto,
  })
  async getEventById(
    @Param('id', ParseIntPipe) eventId: number,
    @GetAuthUser() user: UserWithAccount | undefined,
  ): Promise<EventResponseDto> {
    return this.eventService.getEventByIdForUser(eventId, user);
  }

  @Post(':eventId/attendee')
  @UseGuards(JwtGuard, CanViewWorkspaceGuard, WorkspaceRolesGuard)
  @RequireWorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.TEACHER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an event' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiResponse({
    status: 201,
    description: 'Attendee created successfully',
    type: AttendeeResponseDto,
  })
  async createAttendee(
    @GetAuthUser() user: UserWithAccount,
    @EventById('eventId') event: EventWithWorkspace,
    @Body() createAttendeeDto: CreateAttendeeDto,
  ): Promise<AttendeeResponseDto[]> {
    let attendeeUser: UserWithAccount;
    if (createAttendeeDto.userId !== undefined) {
      attendeeUser = await this.userService.getById(
        createAttendeeDto.userId,
        true,
      );
    }
    return await this.eventService.createAttendee(
      event,
      user,
      attendeeUser,
      createAttendeeDto.guestEmail,
      createAttendeeDto.guestName,
      createAttendeeDto.attendSeries,
      createAttendeeDto.role,
    );
  }

  @Patch(':id')
  @UseGuards(JwtGuard, CanViewWorkspaceGuard, WorkspaceRolesGuard)
  @RequireWorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.TEACHER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an event' })
  @ApiParam({ name: 'id', description: 'Event ID' })
  @ApiResponse({
    status: 200,
    description: 'Event updated successfully',
    type: EventResponseDto,
  })
  async updateEvent(
    @Param('id', ParseIntPipe) eventId: number,
    @GetAuthUser() user: UserWithAccount,
    @Body() updateEventDto: UpdateEventDto,
  ): Promise<EventResponseDto> {
    return this.eventService.updateEvent(eventId, updateEventDto, user);
  }

  @Post(':id/cancel')
  @UseGuards(JwtGuard, CanViewWorkspaceGuard, WorkspaceRolesGuard)
  @RequireWorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.TEACHER)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel an event' })
  @ApiParam({ name: 'id', description: 'Event ID' })
  @ApiResponse({
    status: 200,
    description: 'Event cancelled successfully',
    type: EventResponseDto,
  })
  async cancelEvent(
    @Param('id', ParseIntPipe) eventId: number,
    @GetAuthUser() user: UserWithAccount,
    @Body() cancelEventDto: CancelEventDto,
  ): Promise<EventResponseDto> {
    return this.eventService.cancelEvent(eventId, cancelEventDto, user);
  }

  @Post(':id/attend')
  //@UseGuards(JwtGuard, CanViewWorkspaceGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Attend an event' })
  @ApiParam({ name: 'id', description: 'Event ID' })
  @ApiResponse({
    status: 200,
    description: 'Successfully registered for event',
  })
  async attendEvent(
    @Param('id', ParseIntPipe) eventId: number,
    @GetAuthUser() user: UserWithAccount | undefined,
    @WorkspaceBySlug() workspace: Workspace,
    @Body() attendEventDto: AttendEventDto,
  ): Promise<{ message: string }> {
    await this.eventService.attendEvent(
      eventId,
      attendEventDto,
      user,
      workspace.id,
    );
    return { message: 'Successfully registered for event' };
  }
}

/*
// Additional controller for public event access
@ApiTags('public-events')
@Controller('public/events')
export class PublicEventController {
  constructor(private eventService: EventService) {}

  @Get('workspace/:slug')
  //@UseGuards(OptionalJwtGuard)
  @ApiOperation({ summary: 'Get public events for a workspace' })
  @ApiParam({ name: 'slug', description: 'Workspace slug' })
  @ApiResponse({
    status: 200,
    description: 'List of public events',
    type: PaginatedResponseDto<EventResponseDto>,
  })
  async getPublicWorkspaceEvents(
    @Param('slug') slug: string,
    @GetAuthUser() user: UserWithAccount | undefined,
    @Query() searchDto: SearchEventsDto,
    @GetPagination() paginationDto: PaginationDto,
  ): Promise<PaginatedResponseDto<EventResponseDto>> {
    // Force visibility to PUBLIC for this endpoint
    const publicSearchDto = { ...searchDto, visibility: 'PUBLIC' as any };

    // Find workspace by slug
    // Note: You'll need to inject WorkspaceService or add this method to EventService
    // For now, assuming workspace lookup is handled in service

    return this.eventService.getWorkspaceEvents(
      0, // This needs workspace lookup implementation
      publicSearchDto,
      paginationDto,
      user,
    );
  }

  @Get(':id')
  //@UseGuards(OptionalJwtGuard)
  @ApiOperation({ summary: 'Get public event by ID' })
  @ApiParam({ name: 'id', description: 'Event ID' })
  @ApiResponse({
    status: 200,
    description: 'Public event details',
    type: EventResponseDto,
  })
  async getPublicEventById(
    @Param('id', ParseIntPipe) eventId: number,
    @GetAuthUser() user: UserWithAccount | undefined,
  ): Promise<EventResponseDto> {
    return this.eventService.getEventById(eventId, user);
  }
}
*/
