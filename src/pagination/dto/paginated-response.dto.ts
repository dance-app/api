export class PaginatedResponseDto<T> {
  data: T[];
  meta: {
    totalCount: number;
    count: number;
    limit: number;
    offset: number;
    page: number;
    pages: number;
  };
}
