import {
  Controller,
  // Get,
  Post,
  // Delete,
  // Put,
  // UseGuards,
  Body,
  // Param,
} from '@nestjs/common';

// import { JwtGuard } from '../auth/guard';
import { CreateEventDto } from './dto';
import { EventService } from './event.service';

@Controller('events')
export class EventController {
  constructor(private eventService: EventService) {}

  @Post('')
  createEvent(@Body() data: CreateEventDto) {
    return this.eventService.createEvent(data);
  }

  // @UseGuards(JwtGuard)
  // @Get('')
  // getEvents() {
  //   return this.eventService.readEvents();
  // }

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
