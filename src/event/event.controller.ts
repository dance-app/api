import {
  Controller,
  Get,
  Post,
  // Delete,
  // Put,
  UseGuards,
  Body,
  // Param,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';

import { CreateEventDto } from './dto';
import { EventService } from './event.service';

import { JwtGuard } from '@/auth/guard';
import { GetPagination } from '@/pagination/decorator';
import { PaginationDto, PaginationQuery } from '@/pagination/dto';

@ApiBearerAuth()
@Controller('events')
export class EventController {
  constructor(private eventService: EventService) {}

  @Post('')
  createEvent(@Body() data: CreateEventDto) {
    return this.eventService.createEvent(data);
  }

  @UseGuards(JwtGuard)
  @Get('')
  getEvents(@GetPagination() paginationOptions: PaginationDto) {
    return this.eventService.readEvents(paginationOptions);
  }

  // @Get(':eventId')
  // getEvent(@Param('serviceId') eventId: string) {
  //   return this.eventService.readEvent(eventId);
  // }

  // @Put(':eventId')
  // updateEvent(@Param('serviceId') eventId: string, @Body() eventDto: EventDto) {
  //   return this.eventService.updateEvent(eventId, eventDto);
  // }

  // @Delete(':eventId')
  // deleteEvent(@Param('serviceId') eventId: string) {
  //   return this.eventService.deleteEvent(eventId);
  // }
}
