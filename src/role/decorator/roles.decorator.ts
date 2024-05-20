import { SetMetadata } from '@nestjs/common';
import { WorkspaceRole } from '@prisma/client';

export const ROLE_KEY = 'roles';
export const ONLY_SUPER_ADMIN_KEY = 'onlySuperAdmin';

export const Roles = (
  allowedRoles: WorkspaceRole[],
  onlySuperAdmin = false,
) => {
  return onlySuperAdmin
    ? SetMetadata(ONLY_SUPER_ADMIN_KEY, true)
    : SetMetadata(ROLE_KEY, allowedRoles);
};
