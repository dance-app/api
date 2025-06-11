import { ApiPropertyOptional } from '@nestjs/swagger';
import { EventVisibility } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsDate,
  IsInt,
  IsEnum,
  Min,
  Max,
  MinLength,
  MaxLength,
  IsArray,
  IsBoolean,
} from 'class-validator';

export class UpdateEventDto {
  @ApiPropertyOptional({
    description: 'Event name',
    example: 'Advanced Salsa Class',
    minLength: 1,
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({
    description: 'Event description',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Event start date and time',
    type: Date,
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dateStart?: Date;

  @ApiPropertyOptional({
    description: 'Event end date and time',
    type: Date,
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dateEnd?: Date;

  @ApiPropertyOptional({
    description: 'Event location',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  location?: string;

  @ApiPropertyOptional({
    description: 'Minimum capacity for the event to proceed',
    minimum: 0,
    maximum: 1000,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  capacityMin?: number;

  @ApiPropertyOptional({
    description: 'Maximum capacity for the event',
    minimum: 1,
    maximum: 1000,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  capacityMax?: number;

  @ApiPropertyOptional({
    description: 'Offset for leader/follower balance',
    minimum: -50,
    maximum: 50,
  })
  @IsOptional()
  @IsInt()
  @Min(-50)
  @Max(50)
  leaderOffset?: number;

  @ApiPropertyOptional({
    description: 'Event visibility setting',
    enum: EventVisibility,
  })
  @IsOptional()
  @IsEnum(EventVisibility)
  visibility?: EventVisibility;

  @ApiPropertyOptional({
    description: 'Additional organizer user IDs',
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Type(() => Number)
  additionalOrganizerIds?: number[];
}
