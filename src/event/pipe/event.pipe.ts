import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';

import { EventService } from '../event.service';

@Injectable()
export class ParseEventIdPipe implements PipeTransform {
  // inject any dependency
  constructor(private eventService: EventService) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async transform(id: number, metadata: ArgumentMetadata) {
    //console.log('additional options', metadata.data);
    return await this.eventService.getEventById(id);
  }
}
