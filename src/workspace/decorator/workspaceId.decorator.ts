import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { WorkspaceIdQuery } from '../dto';

export const GetWorkspaceId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request: { query: WorkspaceIdQuery } & Express.Request = ctx
      .switchToHttp()
      .getRequest();

    const workspaceId = parseInt(request.query.id, 10);

    return {
      workspaceId,
    };
  },
);
