import { ApiPropertyOptional } from '@nestjs/swagger';
import { AttendanceAction, DanceRole } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class AttendEventDto {
  @ApiPropertyOptional({
    description: 'Attendace update',
    enum: AttendanceAction,
  })
  @IsEnum(AttendanceAction)
  action: AttendanceAction;

  @ApiPropertyOptional({
    description: 'Preferred dance role',
    enum: DanceRole,
  })
  @IsOptional()
  @IsEnum(DanceRole)
  role?: DanceRole;
}
