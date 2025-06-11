import {
  Injectable,
  CanActivate,
  ExecutionContext,
  NotFoundException,
} from '@nestjs/common';

import { EventService } from '../event.service';

import { UserWithAccount } from '@/user/user.types';

@Injectable()
export class IsEventOrganizerGuard implements CanActivate {
  constructor(private eventService: EventService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const eventId = request.params.eventId as string | null | undefined;
    const eventIdInt = eventId
      ? parseInt(eventId)
      : (eventId as null | undefined);
    const user = request.user as UserWithAccount | null | undefined;

    if (!user || !eventId) return false;

    const event = await this.eventService.findEventById(eventIdInt);
    if (!event) throw new NotFoundException("event doesn't exist");
    const isEventOrganizer = this.eventService.isUserOrgnanizer(event, user);

    return isEventOrganizer;
  }
}
