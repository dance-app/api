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
import { JwtGuard } from 'src/auth/guard';
import { GetPagination } from 'src/pagination/decorator';
import { PaginationDto } from 'src/pagination/dto';

import { CreateEventDto } from './dto';
import { EventService } from './event.service';
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
