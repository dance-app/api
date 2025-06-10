import { CanActivate, Injectable, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { WorkspaceRole } from '@prisma/client';

import { ONLY_SUPER_ADMIN_KEY, ROLE_KEY } from '../decorator/roles.decorator';

import { DatabaseService } from '@/database/database.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private database: DatabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!!request.user.isSuperAdmin) return true;

    const onlySuperAdmin = this.reflector.get<boolean>(
      ONLY_SUPER_ADMIN_KEY,
      context.getHandler(),
    );

    if (onlySuperAdmin) return false;

    const roles = this.reflector.get<WorkspaceRole[]>(
      ROLE_KEY,
      context.getHandler(),
    );

    // console.log('roles', roles);
    // console.log('request', Object.keys(request));

    // console.log(';', Object.keys(u));
    // console.log(';', request.user);
    return true;
  }
}
