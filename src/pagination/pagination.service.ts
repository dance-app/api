import { Injectable } from '@nestjs/common';

import {
  PaginatedResponseDto,
  PaginationDto,
  PaginationOptions,
  PaginationQuery,
} from './dto';
import { DEFAULT_PAGE_SIZE } from './pagination.constant';

@Injectable()
export class PaginationService {
  constructor() {}

  extractPaginationOptions(options: PaginationDto): PaginationOptions {
    return {
      skip: options.offset ?? DEFAULT_PAGE_SIZE.offset,
      take: options.limit ?? DEFAULT_PAGE_SIZE.limit,
    };
  }

  createPaginatedResponse<T>(
    data: T[],
    totalCount: number,
    paginationOptions: PaginationDto,
  ): PaginatedResponseDto<T> {
    const limit = paginationOptions.limit ?? DEFAULT_PAGE_SIZE.limit;
    const offset = paginationOptions.offset ?? DEFAULT_PAGE_SIZE.offset;
    const page = Math.floor(offset / limit) + 1;
    const pages = Math.ceil(totalCount / limit);
    return {
      data,
      meta: {
        totalCount,
        count: data.length,
        page,
        pages,
        limit,
        offset,
      },
    };
  }
}
