import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

import { WorkspaceService } from '../workspace.service';

import { UserWithAccount } from '@/user/user.types';

@Injectable()
export class CanViewWorkspaceGuard implements CanActivate {
  constructor(private workspaceService: WorkspaceService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const slug = request.params.slug as string | null | undefined;
    const user = request.user as UserWithAccount | null | undefined;

    if (!user || !slug) return false;

    const canAccessWorkspace = await this.workspaceService.canAccessWorkspace(
      user,
      slug,
    );

    return canAccessWorkspace;
  }
}
