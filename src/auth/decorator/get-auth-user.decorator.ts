/**
 * @see https://docs.nestjs.com/custom-decorators
 */
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const GetAuthUser = createParamDecorator(
  (data: string, context: ExecutionContext) => {
    const request: {
      user: any;
    } & Express.Request = context.switchToHttp().getRequest();
    /**
     * Express is putting by default the result inside the `user` key from
     * request object
     */
    const user = request.user;
    return data ? user?.[data] : user;
  },
);
