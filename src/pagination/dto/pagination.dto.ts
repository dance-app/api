import { IsInt, IsOptional, IsPositive, IsString } from 'class-validator';

// Input extracted from query params
export class PaginationQuery {
  @IsOptional()
  @IsString()
  @IsPositive()
  readonly limit: string;

  @IsOptional()
  @IsString()
  @IsPositive()
  readonly offset: string;
}

// Parsed PaginationQuery
export class PaginationDto {
  @IsOptional()
  @IsInt()
  @IsPositive()
  readonly limit: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  readonly offset: number;
}

// Prisma params
export type PaginationOptions = {
  skip: number;
  take: number;
};
