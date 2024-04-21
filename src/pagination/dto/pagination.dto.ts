import { IsInt, IsOptional, IsPositive, IsString } from 'class-validator';

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
