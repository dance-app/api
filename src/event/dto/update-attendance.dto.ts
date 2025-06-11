import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AttendanceType, DanceRole } from '@prisma/client';
import { IsString, IsOptional, IsEnum, MaxLength } from 'class-validator';

export class AttendanceDto {
  @ApiPropertyOptional({
    description: 'Dance role for this event',
    enum: DanceRole,
    example: DanceRole.LEADER,
  })
  @IsOptional()
  @IsEnum(DanceRole)
  role?: DanceRole;

  @ApiProperty({
    description: 'Attendance type',
    enum: AttendanceType,
    example: AttendanceType.VALIDATE,
    default: AttendanceType.VALIDATE,
  })
  @IsEnum(AttendanceType)
  type: AttendanceType = AttendanceType.VALIDATE;
}

export class AttendanceHistoryDto {
  @ApiProperty({
    description: 'Attendance action type',
    enum: [
      'INVITED',
      'REGISTERED',
      'CONFIRMED',
      'CANCELLED',
      'DECLINED',
      'ROLE_CHANGED',
    ],
    example: 'REGISTERED',
  })
  @IsEnum([
    'INVITED',
    'REGISTERED',
    'CONFIRMED',
    'CANCELLED',
    'DECLINED',
    'ROLE_CHANGED',
  ])
  action: string;

  @ApiPropertyOptional({
    description: 'Dance role at the time of this action',
    enum: DanceRole,
  })
  @IsOptional()
  @IsEnum(DanceRole)
  role?: DanceRole;

  @ApiPropertyOptional({
    description: 'Attendance type at the time of this action',
    enum: AttendanceType,
  })
  @IsOptional()
  @IsEnum(AttendanceType)
  type?: AttendanceType;

  @ApiPropertyOptional({
    description: 'Additional notes for this attendance change',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
