import { ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';

export class SearchNotificationsDto {
  @ApiPropertyOptional({
    description: 'Filter by read status',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  read?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by notification type',
    enum: NotificationType,
  })
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;
}
