import { ApiPropertyOptional } from '@nestjs/swagger';
import { WeekStart } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateWorkspaceDto {
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name: string;

  @IsString()
  @IsOptional()
  @Matches(/^[a-z0-9-]+$/)
  slug?: string;

  @IsEnum(WeekStart)
  @IsOptional()
  weekStart?: WeekStart = WeekStart.MONDAY;

  @IsInt()
  @IsOptional()
  @ApiPropertyOptional({
    description:
      'ID of the user who will be the owner. Should be the ID of the signed in user, unless used by SuperAdmin to create a workspace on behalf of another user, or even to create a workspace with no owner',
  })
  ownerId?: number;
}
