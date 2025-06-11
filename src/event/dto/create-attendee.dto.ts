import { ApiPropertyOptional } from '@nestjs/swagger';
import { AttendanceAction, DanceRole } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateAttendeeDto {
  @ApiPropertyOptional({
    description: 'Id of the user that will attend',
    enum: DanceRole,
  })
  @IsOptional()
  @IsInt()
  userId?: number;

  @ApiPropertyOptional({
    description:
      'Email of the guest that wil attend. (only if userId is not specified, ignored otherwise)',
  })
  @IsOptional()
  @IsString()
  guestEmail?: string;

  @ApiPropertyOptional({
    description:
      'Name of the guest that wil attend. (only if userId is not specified, ignored otherwise)',
  })
  @IsOptional()
  @IsString()
  guestName?: string;

  @ApiPropertyOptional({
    description: 'Preferred dance role',
    enum: DanceRole,
  })
  @IsOptional()
  @IsEnum(DanceRole)
  role?: DanceRole;

  @ApiPropertyOptional({
    description: 'Whether to attend all events in a recurring series',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  attendSeries?: boolean = false;

  @ApiPropertyOptional({
    description: 'Attendance status',
    enum: AttendanceAction,
  })
  @IsOptional()
  @IsEnum(AttendanceAction)
  status?: AttendanceAction = AttendanceAction.REGISTERED;
}
