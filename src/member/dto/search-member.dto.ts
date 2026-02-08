import { DanceRole } from '@prisma/client';
import { Transform, TransformationType } from 'class-transformer';
import { IsEnum, IsOptional, IsString } from 'class-validator';

import { ERROR_MESSAGES } from '@/lib/constants';

export class SearchMembersDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value, type }) => {
    if (type !== TransformationType.PLAIN_TO_CLASS) return value;
    return value?.split(',').map((role) => role.trim());
  })
  @IsEnum(DanceRole, {
    each: true,
    message: ERROR_MESSAGES.DANCE_ROLE_FILTER_INVALID,
  })
  roles?: DanceRole[];
}
