import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EventVisibility } from '@prisma/client';
import { Type } from 'class-transformer';
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
} from 'class-validator';

// Base Event DTOs
export class CreateEventDto {
  @ApiProperty({
    description: 'Event name',
    example: 'Beginner Salsa Class',
    minLength: 1,
    maxLength: 200,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({
    description: 'Event description',
    example: 'A fun beginner-friendly salsa class focusing on basic steps',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({
    description: 'Event start date and time',
    example: '2025-06-01T19:00:00Z',
    type: Date,
  })
  @Type(() => Date)
  @IsDate()
  dateStart: Date;

  @ApiPropertyOptional({
    description: 'Event end date and time',
    example: '2025-06-01T21:00:00Z',
    type: Date,
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dateEnd?: Date;

  @ApiPropertyOptional({
    description: 'Event location',
    example: 'Studio A, Main Dance Hall',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  location?: string;

  @ApiPropertyOptional({
    description: 'Minimum capacity for the event to proceed',
    example: 4,
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
    example: 20,
    minimum: 1,
    maximum: 1000,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  capacityMax?: number;

  @ApiPropertyOptional({
    description:
      'Offset for leader/follower balance (positive means more leaders needed)',
    example: 0,
  })
  @IsOptional()
  @IsInt()
  leaderOffset: number = 0;

  @ApiProperty({
    description: 'Event visibility setting',
    enum: EventVisibility,
    example: EventVisibility.WORKSPACE_ONLY,
  })
  @IsEnum(EventVisibility)
  visibility: EventVisibility;

  @ApiPropertyOptional({
    description: 'iCalendar RRULE string for recurring events',
    example: 'FREQ=WEEKLY;BYDAY=MO,WE,FR;COUNT=10',
  })
  @IsOptional()
  @IsString()
  rrule?: string;

  @ApiPropertyOptional({
    description:
      'Additional organizer user IDs (creator is automatically an organizer)',
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Type(() => Number)
  additionalOrganizerIds?: number[];
}
