import { Injectable } from '@nestjs/common';

import { PaginationDto } from './dto';
import { DEFAULT_PAGE_SIZE } from './pagination.constant';

@Injectable()
export class PaginationService {
  constructor() {}

  extractPaginationOptions(options: PaginationDto) {
    return {
      skip: options.offset ?? DEFAULT_PAGE_SIZE.offset,
      take: options.limit ?? DEFAULT_PAGE_SIZE.limit,
    };
  }
}
