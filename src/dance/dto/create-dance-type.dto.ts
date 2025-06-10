import { DanceCategory, DanceTypeEnum } from '@prisma/client';
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateDanceTypeDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsEnum(DanceTypeEnum)
  type: DanceTypeEnum;

  @IsEnum(DanceCategory)
  @IsOptional()
  category?: DanceCategory;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;
}
