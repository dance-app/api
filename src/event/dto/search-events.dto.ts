import { ApiPropertyOptional } from '@nestjs/swagger';
import { EventVisibility } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';

export class SearchEventsDto {
  @ApiPropertyOptional({ description: 'Search by event name' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by event visibility' })
  @IsOptional()
  @IsEnum(EventVisibility)
  visibility?: EventVisibility;

  @ApiPropertyOptional({ description: 'Filter events from this date' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dateFrom?: Date;

  @ApiPropertyOptional({ description: 'Filter events until this date' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dateTo?: Date;

  @ApiPropertyOptional({ description: 'Include cancelled events' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeCancelled?: boolean = false;

  @ApiPropertyOptional({ description: 'Filter by organizer user ID' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  organizerId?: number;
}
