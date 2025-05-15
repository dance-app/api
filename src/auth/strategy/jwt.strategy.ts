import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { AuthService } from '../auth.service';
import { JwtPayload } from '../dto';
import { SafeUserDto } from '../dto/safe-user.dto';

export const STRATEGY_NAME = 'jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, STRATEGY_NAME) {
  constructor(
    config: ConfigService,
    private authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // TODO: handle refresh token then use the expiration
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_SECRET'),
    });
  }

  /**
   * @returns {UserAccount | Null} Returning null with provoke a 401 Unauthorized error
   */
  async validate(payload: JwtPayload): Promise<SafeUserDto> {
    const user = await this.authService.validateJwtPayload(payload); // throws if invalid token
    return this.authService.mapToSafeUser(user, user.accounts);
  }
}
