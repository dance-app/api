import { Injectable } from '@nestjs/common';

import { CreateEventDto } from './dto';

import { DatabaseService } from '@/database/database.service';
import { PaginationDto, PaginationQuery } from '@/pagination/dto';
import { PaginationService } from '@/pagination/pagination.service';

@Injectable({})
export class EventService {
  constructor(
    private database: DatabaseService,
    private pagination: PaginationService,
  ) {}

  async readEvents(paginationOptions: PaginationDto) {
    const events = await this.database.event.findMany({
      ...this.pagination.extractPaginationOptions(paginationOptions),
    });
    return {
      statusCode: 200,
      data: events,
    };
  }

  readEvent(eventId: string) {
    console.log('eventId', eventId);
    return {
      statusCode: 200,
      data: getMockEvents()[0],
    };
  }

  async createEvent(data: CreateEventDto) {
    console.log('eventDto', data);

    // const newUser = await this.database.event.create({
    //   data: { fullName: data.fullName },
    // });

    return {
      message: 'User created',
      data: null,
    };
  }

  async updateEvent(eventId: string, eventDto: CreateEventDto) {
    console.log('eventId', eventId);
    console.log('eventDto', eventDto);
    return {
      statusCode: 200,
      data: getMockEvents()[0],
      message: [`event with id ${eventId} updated`],
    };
  }
  async deleteEvent(eventId: string) {
    console.log('eventId', eventId);
    return {
      data: true,
      statusCode: 200,
      message: ['event deleted'],
    };
  }
}

function getMockEvents() {
  return [
    {
      id: 1,
      title: 'One-time Event',
      description: 'A one-time event on a specific date and time',
      dateStart: new Date('2023-03-15T10:30:00'),
      dateEnd: new Date('2023-03-15T11:30:00'),
      location: 'Event Location 1',
      timezone: 'America/New_York',
      recurrenceRule: null,
    },
    {
      id: 2,
      title: 'Recurring Weekly Event',
      description: 'A recurring weekly event on multiple days of the week',
      dateStart: new Date('2023-03-20T09:00:00'),
      dateEnd: new Date('2023-03-20T10:00:00'),
      location: 'Event Location 2',
      timezone: 'America/Los_Angeles',
      recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO,WE,FR',
    },
    {
      id: 3,
      title: 'Monthly Event',
      description: 'A monthly event on a specific day of the month',
      dateStart: new Date('2023-03-10T14:00:00'),
      dateEnd: new Date('2023-03-10T15:00:00'),
      location: 'Event Location 3',
      timezone: 'Europe/London',
      recurrenceRule: 'FREQ=MONTHLY;BYMONTHDAY=10',
    },
    {
      id: 4,
      title: 'Yearly Event',
      description: 'A yearly event on a specific day and month',
      dateStart: new Date('2023-12-25T12:00:00'),
      dateEnd: new Date('2023-12-25T13:00:00'),
      location: 'Event Location 4',
      timezone: 'Asia/Tokyo',
      recurrenceRule: 'FREQ=YEARLY;BYMONTH=12;BYMONTHDAY=25',
    },
    {
      id: 5,
      title: 'Recurring Event with Time',
      description: 'A recurring event with a specific start and end time',
      dateStart: new Date('2023-03-18T15:00:00'),
      dateEnd: new Date('2023-03-18T17:00:00'),
      location: 'Event Location 5',
      timezone: 'UTC',
      recurrenceRule: 'FREQ=WEEKLY;BYDAY=SA',
    },
  ];
}
