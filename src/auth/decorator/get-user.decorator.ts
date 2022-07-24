import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const GetUserAccount = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request: Express.Request = ctx.switchToHttp().getRequest();

    /**
     * Express is putting by default the result inside the `user` key from
     * request object
     */
    const userAccount = request.user;

    return userAccount;
  },
);
