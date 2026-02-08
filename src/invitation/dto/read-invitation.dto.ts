import { ApiProperty } from '@nestjs/swagger';
import { InvitationStatus, InviteType } from '@prisma/client';

export class ReadInvitationDto {
  @ApiProperty({ description: 'Unique identifier for the invitation' })
  id: string;

  @ApiProperty({ description: 'What is the invite for' })
  type: InviteType;

  @ApiProperty({ description: 'When the invitation was created' })
  createdAt: Date;

  @ApiProperty({ description: 'When the invitation was last updated' })
  updatedAt: Date;

  @ApiProperty({
    description: 'Email of the invited user if not an existing user',
  })
  email?: string;

  @ApiProperty({
    description: 'Phone number of the invited user if provided',
  })
  phone?: string;

  @ApiProperty({ description: 'First name of the invited user' })
  firstName?: string;

  @ApiProperty({ description: 'Last name of the invited user' })
  lastName?: string;

  @ApiProperty({
    description: 'Unique token used for accepting/declining the invitation',
  })
  token: string;

  @ApiProperty({ description: 'When the invitation expires' })
  expiresAt: Date;

  @ApiProperty({
    description: 'Current status of the invitation',
    enum: InvitationStatus,
  })
  status: InvitationStatus;

  @ApiProperty({ description: 'ID of the workspace' })
  workspaceId: string;

  @ApiProperty({ description: 'Name of the workspace' })
  workspaceName: string;

  @ApiProperty({ description: 'Slug of the workspace' })
  workspaceSlug: string;

  @ApiProperty({ description: 'ID of the user who sent the invitation' })
  inviterId: string;

  @ApiProperty({ description: 'Name of the user who sent the invitation' })
  inviterName: string;

  @ApiProperty({
    description:
      'ID of the user who received the invitation (if existing user)',
  })
  inviteeId?: string;

  @ApiProperty({
    description: 'ID of the member seat reserved for this invitation',
  })
  memberSeatId: string;
}
