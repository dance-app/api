import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { PaginationQuery } from '../dto';
import { DEFAULT_PAGE_SIZE } from '../pagination.constant';

export const GetPagination = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request: { query: PaginationQuery } & Express.Request = ctx
      .switchToHttp()
      .getRequest();

    const offset = parseInt(request.query.offset, 10);
    const take = parseInt(request.query.limit, 10);

    return {
      offset: Number.isNaN(offset) ? DEFAULT_PAGE_SIZE.offset : offset,
      limit: Number.isNaN(take) ? DEFAULT_PAGE_SIZE.limit : take,
    };
  },
);
