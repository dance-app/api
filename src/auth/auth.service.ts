import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AccountProvider } from '@prisma/client';
import * as argon from 'argon2';
import { DatabaseService } from 'src/database/database.service';
import { ApiError } from 'src/types';

import { AuthDto } from './dto';

@Injectable({})
export class AuthService {
  constructor(
    private database: DatabaseService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async signUp(authDto: AuthDto) {
    const existingAccount = await this.database.account.findFirst({
      where: {
        provider: AccountProvider.LOCAL,
        email: authDto.email,
      },
    });

    if (existingAccount)
      throw new ForbiddenException(ApiError.ACCOUNT_ALREADY_EXISTS);

    const hash = await argon.hash(authDto.password);
    const user = await this.database.user.create({
      data: {
        accounts: {
          create: {
            provider: AccountProvider.LOCAL,
            email: authDto.email,
            password: hash,
          },
        },
      },
      include: {
        accounts: true,
      },
    });

    return user;
  }

  async signIn(authDto: AuthDto) {
    const account = await this.database.account.findFirst({
      where: {
        provider: AccountProvider.LOCAL,
        email: authDto.email,
      },
    });

    if (!account) throw new ForbiddenException(ApiError.ACCOUNT_NOT_FOUND);

    const isPasswordCorrect = await argon.verify(
      account.password,
      authDto.password,
    );

    if (!isPasswordCorrect)
      throw new ForbiddenException('Credentials not correct');

    const signedToken = await this.signToken(account.userId, account.email);

    return {
      accessToken: signedToken,
    };
  }

  signToken(userId: number, email: string) {
    const payload = {
      sub: userId,
      email,
    };

    return this.jwt.signAsync(payload, {
      expiresIn: '100 days',
      secret: this.config.get('JWT_SECRET'),
    });
  }
}
