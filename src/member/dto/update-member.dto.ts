import { DanceRole, WorkspaceRole } from '@prisma/client';
import { Transform, TransformationType } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';

import { ERROR_MESSAGES } from '@/lib/constants';
import { normalizePhoneE164 } from '@/lib/phone';
import { IsE164Phone } from '@/lib/validators/is-e164-phone';

export class UpdateMemberDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value, type }) => {
    if (type !== TransformationType.PLAIN_TO_CLASS) return value;
    if (typeof value === 'string') return normalizePhoneE164(value.trim());
    return value;
  })
  @IsE164Phone({ message: ERROR_MESSAGES.INVALID_PHONE_NUMBER })
  phone?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsArray()
  @IsEnum(WorkspaceRole, { each: true })
  @IsOptional()
  roles?: WorkspaceRole[];

  @IsString()
  @IsEnum(DanceRole)
  @IsOptional()
  preferredDanceRole?: DanceRole = undefined;
}
