/**
 * @see https://docs.nestjs.com/custom-decorators
 */
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const GetAuthUserAccount = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request: {
      user: any;
    } & Express.Request = ctx.switchToHttp().getRequest();

    /**
     * Express is putting by default the result inside the `user` key from
     * request object
     */
    return request.user;
  },
);
