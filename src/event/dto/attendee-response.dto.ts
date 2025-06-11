import { ApiProperty } from '@nestjs/swagger';
import { AttendanceAction, DanceRole } from '@prisma/client';

import { SafeUserDto } from '@/auth/dto/safe-user.dto';

export class AttendeeResponseDto {
  @ApiProperty({ description: 'Attendee ID' })
  id: number;

  @ApiProperty({
    description: 'User information',
    type: SafeUserDto || undefined,
  })
  user?: SafeUserDto;

  @ApiProperty({
    description: 'Guest email (if no user exists)',
  })
  guestEmail?: string; // TODO: this should probably not be public....

  @ApiProperty({
    description: 'Guest name (if no user exists)',
  })
  guestName?: string;

  @ApiProperty({
    description: 'Dance role preference',
    enum: DanceRole,
  })
  role?: DanceRole;

  @ApiProperty({
    description: 'Attendance status',
    enum: AttendanceAction,
  })
  status: AttendanceAction;

  @ApiProperty({ description: 'When the attendance was created' })
  createdAt: Date;

  @ApiProperty({ description: 'When the attendance was last updated' })
  updatedAt: Date;

  @ApiProperty({ description: 'Was invited through invitation' })
  wasInvited: boolean;
}
