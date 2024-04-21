import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { AccountProvider } from '@prisma/client';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { DatabaseService } from 'src/database/database.service';
import { JwtStrategyPayload, UserWithAccount } from 'src/types';

export const STRATEGY_NAME = 'jwt';

@Injectable()
export class JwTStrategy extends PassportStrategy(Strategy, STRATEGY_NAME) {
  constructor(
    config: ConfigService,
    private database: DatabaseService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // TODO: handle refresh token then use the expiration
      ignoreExpiration: true,
      secretOrKey: config.get('JWT_SECRET'),
    });
  }

  /**
   * @returns {UserAccount | Null} Returning null with provoke a 401 Unauthorized error
   */
  async validate(payload: JwtStrategyPayload): Promise<UserWithAccount | null> {
    try {
      const account = await this.database.account.findFirst({
        where: {
          provider: AccountProvider.LOCAL,
          userId: payload.sub,
          email: payload.email,
        },
        include: {
          user: true,
        },
      });

      if (account && !!account.user.token) {
        const user = account.user;
        delete user.token;
        const accountWithoutUser = account;
        delete accountWithoutUser.user;
        delete accountWithoutUser.userId;
        delete accountWithoutUser.password;
        const exposedUser = {
          ...user,
          account: accountWithoutUser,
        };

        return exposedUser;
      } else {
        return null;
      }
    } catch (error) {
      return null;
    }
  }
}
