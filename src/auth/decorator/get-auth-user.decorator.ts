/**
 * @see https://docs.nestjs.com/custom-decorators
 */
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const GetAuthUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    const request: {
      user: any;
    } & Express.Request = context.switchToHttp().getRequest();
    /**
     * Express is putting by default the result inside the `user` key from
     * request object
     */
    return request.user;
  },
);
