import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { AccountProvider } from '@prisma/client';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { DatabaseService } from 'src/database/database.service';

export const STRATEGY_NAME = 'jwt';

@Injectable()
export class JwTStrategy extends PassportStrategy(Strategy, STRATEGY_NAME) {
  constructor(config: ConfigService, private database: DatabaseService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // TODO: handle refresh token then use the expiration
      ignoreExpiration: true,
      secretOrKey: config.get('JWT_SECRET'),
    });
  }

  async validate(payload: { sub: number; email: string }) {
    const account = await this.database.account.findFirst({
      where: {
        provider: AccountProvider.LOCAL,
        userId: payload.sub,
        email: payload.email,
      },
    });

    if (account) {
      delete account.password;
    }

    return account;
  }
}
