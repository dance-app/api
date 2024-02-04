import {
  Controller,
  Get,
  Post,
  Delete,
  Put,
  // UseGuards,
  Body,
  Param,
} from '@nestjs/common';

// import { JwtGuard } from '../auth/guard';
import { EventDto } from './dto';
import { EventService } from './event.service';

@Controller('events')
export class EventController {
  constructor(private eventService: EventService) {}

  // @UseGuards(JwtGuard)
  @Get('')
  getEvents() {
    return this.eventService.readEvents();
  }

  @Get(':eventId')
  getEvent(@Param('serviceId') eventId: string) {
    return this.eventService.readEvent(eventId);
  }

  @Post('')
  createEvent(@Body() eventDto: EventDto) {
    return this.eventService.createEvent(eventDto);
  }

  @Put(':eventId')
  updateEvent(@Param('serviceId') eventId: string, @Body() eventDto: EventDto) {
    return this.eventService.updateEvent(eventId, eventDto);
  }

  @Delete(':eventId')
  deleteEvent(@Param('serviceId') eventId: string) {
    return this.eventService.deleteEvent(eventId);
  }
}
