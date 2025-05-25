import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { ParseWorkspaceSlugPipe } from '../pipe/workspace.pipe';

export const GetWorkspaceSlug = createParamDecorator(
  (paramName: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.params[paramName];
  },
);

export const WorkspaceBySlug = (slugParamName: string = 'slug') =>
  GetWorkspaceSlug(slugParamName, ParseWorkspaceSlugPipe);
