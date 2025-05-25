import { DanceRole, WorkspaceRole } from '@prisma/client';
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

import { DanceLevel } from '../enums/dance-level.enum';

export class AddMemberDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  @IsOptional()
  memberName?: string;

  @IsInt()
  @IsOptional()
  userId?: number;

  @IsArray()
  @IsEnum(WorkspaceRole, { each: true })
  roles: WorkspaceRole[] = [WorkspaceRole.STUDENT];

  @IsString()
  @IsEnum(DanceRole)
  @IsOptional()
  preferedDanceRole?: DanceRole = undefined;

  @IsNumber()
  @IsEnum(DanceLevel)
  @IsOptional()
  level?: DanceLevel = undefined;
}
