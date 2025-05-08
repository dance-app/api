import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { AccountProvider, User, Account } from '@prisma/client';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { DatabaseService } from '@/database/database.service';
import { UserWithAccount } from '@/user/user.types';

export const STRATEGY_NAME = 'jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, STRATEGY_NAME) {
  constructor(
    config: ConfigService,
    private database: DatabaseService,
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
  async validate(payload: {
    sub: User['id'];
    email: Account['email'];
    iat: number;
    exp: number;
  }): Promise<UserWithAccount> {
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

      if (!account) throw new UnauthorizedException();

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, user, ...accountFields } = account;
      return {
        ...account.user,
        account: accountFields,
      };
    } catch (error) {
      return null;
    }
  }
}
