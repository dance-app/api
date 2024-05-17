import { CanActivate, Injectable, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { WorkspaceRole } from '@prisma/client';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    if (!!request.user.isSuperAdmin) return true;

    const onlySuperAdmin = this.reflector.get<boolean>(
      'onlySuperAdmin',
      context.getHandler(),
    );

    if (onlySuperAdmin) return false;

    const roles = this.reflector.get<WorkspaceRole[]>(
      'roles',
      context.getHandler(),
    );

    console.log('roles', roles);

    // console.log(';', Object.keys(u));
    console.log(';', request.user);
    return true;
  }
}
