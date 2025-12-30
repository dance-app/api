import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WeekStart } from '@prisma/client';
import {
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateWorkspaceDto {
  @ApiProperty({
    description: 'The name of the workspace',
    example: 'My Studio name',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description:
      'The unique slug identifier for the workspace (lowercase letters, numbers, hyphens)',
    example: 'my-studio-name',
  })
  @IsString()
  @IsOptional()
  @Matches(/^[a-z0-9-]+$/)
  slug?: string;

  @ApiPropertyOptional({
    description: 'The day the week starts on',
    example: WeekStart.MONDAY,
  })
  @IsEnum(WeekStart)
  @IsOptional()
  weekStart?: WeekStart = WeekStart.MONDAY;

  @ApiPropertyOptional({
    description:
      'ID of the user who will be the owner. Should be the ID of the signed in user, unless used by SuperAdmin to create a workspace on behalf of another user, or even to create a workspace with no owner',
  })
  @IsString()
  @IsOptional()
  ownerId?: string;
}
