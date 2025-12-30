import { ApiProperty } from '@nestjs/swagger';
import { WeekStart } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateWorkspaceConfigDto {
  @IsEnum(WeekStart)
  @ApiProperty({
    description: 'Day of the week to start the calendar on',
    enum: WeekStart,
    example: WeekStart.MONDAY,
  })
  weekStart: WeekStart;
}
