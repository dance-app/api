import { WeekStart } from '@prisma/client';
import {
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateWorkspaceDto {
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  @Matches(/^[a-z0-9-]+$/)
  slug?: string;

  @IsEnum(WeekStart)
  @IsOptional()
  weekStart?: WeekStart = WeekStart.MONDAY;
}
