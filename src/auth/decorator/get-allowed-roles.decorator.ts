import { SetMetadata } from '@nestjs/common';
import { WorkspaceRole } from '@prisma/client';

export const GetAllowedRoles = (
  allowedRoles: WorkspaceRole[],
  onlySuperAdmin = false,
) => {
  return onlySuperAdmin
    ? SetMetadata('onlySuperAdmin', true)
    : SetMetadata('roles', allowedRoles);
};
