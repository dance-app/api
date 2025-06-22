import { CanActivate, Injectable, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { ONLY_SUPER_ADMIN_KEY } from '../decorator/roles.decorator';

import { DatabaseService } from '@/database/database.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private database: DatabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    if (!!request.user.isSuperAdmin) return true;

    const onlySuperAdmin = this.reflector.get<boolean>(
      ONLY_SUPER_ADMIN_KEY,
      context.getHandler(),
    );

    if (onlySuperAdmin) return false;

    // console.log('roles', roles);
    // console.log('request', Object.keys(request));

    // console.log(';', Object.keys(u));
    // console.log(';', request.user);
    return true;
  }
}
