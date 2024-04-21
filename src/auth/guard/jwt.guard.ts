import { AuthGuard } from '@nestjs/passport';

import { STRATEGY_NAME } from '../strategy';

/**
 * The role of this guard is to abstract the AuthGuard strategy in order to
 * make sure every time we need it wo do not repeat the code to give the
 * strategy name.
 * Simply an anti-error-prone pattern
 */
export class JwtGuard extends AuthGuard(STRATEGY_NAME) {
  constructor() {
    super();
  }
}
