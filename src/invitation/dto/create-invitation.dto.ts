import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';

// An invitation can be sent to an existing User or to an email address
// The invitation is linked to an existing Member/Attendee (must have been created beforehand
export class BaseInvitationDto {
  @ApiPropertyOptional({
    description:
      'Email of the user being invited (optional for existing users)',
  })
  @IsEmail()
  @ValidateIf((o) => !o.inviteeId)
  @IsOptional()
  email?: string;

  @ApiProperty({
    description:
      'ID of the existing user being invited (optional if email is provided)',
  })
  @ValidateIf((o) => !o.email)
  @IsOptional()
  @IsInt()
  inviteeId?: number;

  @ApiProperty({
    description: 'Type of invitation: "workspace" or "event"',
    enum: ['workspace', 'event'],
  })
  @IsEnum(['workspace', 'event'])
  type: 'workspace' | 'event';
}

// Extend with specific DTOs
export class CreateWorkspaceInvitationDto extends BaseInvitationDto {
  @ApiProperty({
    description:
      'ID of the existing member that the user will be linked to if they accept the invitation',
  })
  @IsInt()
  @Type(() => Number)
  memberSeatId: number;

  @ApiProperty({
    description: 'The workspace Slug where the user is being invited',
  })
  @IsString()
  workspaceSlug: string;

  type = 'workspace' as const;
}

export class CreateEventInvitationDto extends BaseInvitationDto {
  @ApiProperty({
    description:
      'ID of the existing member that the user will be linked to if they accept the invitation',
  })
  @IsInt()
  @Type(() => Number)
  attendeeSeatId: number;

  @ApiProperty({
    description: 'The event ID where the user is being invited',
  })
  @IsString()
  eventSlug: string;

  type = 'event' as const;
}
