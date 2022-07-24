import { AuthGuard } from '@nestjs/passport';

import { STRATEGY_NAME } from '../strategy';

export class JwtGuard extends AuthGuard(STRATEGY_NAME) {
  constructor() {
    super();
  }
}
