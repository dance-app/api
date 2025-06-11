import { ApiProperty } from '@nestjs/swagger';
import { AttendanceAction, DanceRole } from '@prisma/client';

import { MemberResponseDto } from '@/member/dto/member-response.dto';
import { PublicUserDto } from '@/user/dto/public-user.dto';

export class AttendanceHistoryResponseDto {
  @ApiProperty({ description: 'History entry ID' })
  id: number;

  @ApiProperty({ description: 'Event ID' })
  eventId: number;

  @ApiProperty({ description: 'Member information', type: MemberResponseDto })
  member: MemberResponseDto;

  @ApiProperty({
    description: 'Action performed',
    enum: AttendanceAction,
  })
  action: AttendanceAction;

  @ApiProperty({ description: 'Previous dance role' })
  previousRole?: DanceRole;

  @ApiProperty({ description: 'New dance role' })
  newRole?: DanceRole;

  @ApiProperty({
    description: 'User who performed the action',
    type: PublicUserDto,
  })
  performedBy: PublicUserDto;

  @ApiProperty({ description: 'Additional notes' })
  notes?: string;

  @ApiProperty({ description: 'Action timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Additional metadata' })
  metadata?: any;
}
