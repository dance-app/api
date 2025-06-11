import { Prisma } from '@prisma/client';

export type EventWithAttendees = Prisma.EventGetPayload<{
  include: {
    attendees: {
      include: {
        historyEntries: true;
        user: true;
      };
    };
    organizers: {
      include: {
        user: true;
      };
    };
    workspace: true;
    createdBy: true;
  };
}>;

export type EventWithWorkspace = Prisma.EventGetPayload<{
  include: {
    workspace: true;
    organizers: {
      include: {
        user: true;
      };
    };
  };
}>;

export type AttendeeWithUser = Prisma.AttendeeGetPayload<{
  include: {
    user: true;
    invitation: true;
    historyEntries: {
      include: {
        performedBy: true;
      };
      orderBy: {
        createdAt: 'desc';
      };
    };
  };
}>;
