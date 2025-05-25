import {
  Injectable,
  CanActivate,
  ExecutionContext,
  SetMetadata,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { WorkspaceRole } from '@prisma/client';

import { MemberService } from '@/member/member.service';
import { UserWithAccount } from '@/user/user.types';

// Decorator to set required roles on route handlers
export const RequireWorkspaceRoles = (...roles: WorkspaceRole[]) =>
  SetMetadata('workspaceRoles', roles);

@Injectable()
export class WorkspaceRolesGuard implements CanActivate {
  private readonly logger = new Logger(WorkspaceRolesGuard.name);
  constructor(
    private reflector: Reflector,
    private memberService: MemberService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.get<WorkspaceRole[]>(
      'workspaceRoles',
      context.getHandler(),
    );

    // If no roles are required, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: UserWithAccount = request.user;
    const slug = request.params.slug;

    // If no user or no slug, deny access
    if (!user || !slug) {
      return false;
    }
    if (user.isSuperAdmin) return true;
    // Check if user has any of the required roles for this workspace
    return this.memberService.userHasWorkspaceRoles(
      slug,
      user.id,
      requiredRoles,
    );
  }
}
