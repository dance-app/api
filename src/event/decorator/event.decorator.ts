import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { ParseEventIdPipe } from '../pipe/event.pipe';

export const GetEventId = createParamDecorator(
  (paramName: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return parseInt(request.params[paramName]);
  },
);

export const EventById = (idParamName: string = 'eventId') =>
  GetEventId(idParamName, ParseEventIdPipe);
