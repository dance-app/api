import { ApiProperty } from '@nestjs/swagger';
import { NotificationType } from '@prisma/client';
import { IsEnum, IsInt, IsOptional } from 'class-validator';

export class CreateNotificationDto {
  @ApiProperty({ description: 'ID of the user to receive the notification' })
  @IsInt()
  userId: number;

  @ApiProperty({
    description: 'Type of notification',
    enum: NotificationType,
    example: NotificationType.INVITATION_RECEIVED,
  })
  @IsEnum(NotificationType)
  type: NotificationType;

  @IsInt()
  @IsOptional()
  // TODO: is mandatory if type of notification is related to invitation
  invitationId?: number;

  /*@IsInt()
  @IsOptional()
  // TODO: is mandatory if type of notification is related to workspace
  workspaceId?: number;

  @IsInt()
  @IsOptional()
  // TODO: is mandatory if type of notification is related to event
  eventId?: number;*/
}
