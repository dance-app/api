import { DanceRole } from '@prisma/client';
import { Transform, TransformationType, Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

export class SearchMembersDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value, type }) => {
    if (type !== TransformationType.PLAIN_TO_CLASS) return value;
    return value?.split(',').map((role) => role.trim());
  })
  @IsEnum(DanceRole, { each: true })
  roles?: DanceRole[];

  @IsOptional()
  @IsString()
  @ValidateIf((o) => !o.minLevel && !o.maxLevel)
  level?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(400)
  minLevel?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(400)
  maxLevel?: number;
}
