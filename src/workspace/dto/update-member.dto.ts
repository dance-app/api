import { WorkspaceRole } from '@prisma/client';
import { IsArray, IsEnum } from 'class-validator';

export class UpdateMemberRolesDto {
  @IsArray()
  @IsEnum(WorkspaceRole, { each: true })
  roles: WorkspaceRole[];
}
