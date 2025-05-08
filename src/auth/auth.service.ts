import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AccountProvider } from '@prisma/client';
import * as argon from 'argon2';

import { SignInDto, SignUpDto } from './dto';

import { DatabaseService } from '@/database/database.service';
import { UserService } from '@/user/user.service';

@Injectable({})
export class AuthService {
  constructor(
    private database: DatabaseService,
    private jwt: JwtService,
    private config: ConfigService,
    private userService: UserService,
  ) {}

  async signUp(data: SignUpDto) {
    const existingAccount = await this.database.user.findFirst({
      where: {
        accounts: {
          some: {
            provider: AccountProvider.LOCAL,
            email: data.email,
          },
        },
      },
    });

    if (!!existingAccount) throw new ForbiddenException('Email already exists');

    const user = await this.userService.create({
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      password: data.password,
      isSuperAdmin: false,
      isVerified: false,
    });

    const safeUser = {
      ...user,
      accounts: user.accounts.map((a) => {
        if (a.provider === AccountProvider.LOCAL) {
          // Omit the password field on LOCAL accounts
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { password, ...rest } = a;
          return rest;
        }
        return a;
      }),
    };
    return safeUser;
  }

  async signIn(data: SignInDto) {
    const account = await this.database.account.findFirst({
      where: {
        provider: AccountProvider.LOCAL,
        email: data.email,
      },
    });

    if (!account) throw new ForbiddenException('Credentials not correct');

    const isPasswordCorrect = await argon.verify(
      account.password,
      data.password,
    );

    if (!isPasswordCorrect)
      throw new ForbiddenException('Credentials not correct');

    const signedToken = await this.signToken(account.userId, account.email);
    await this.database.user.update({
      where: {
        id: account.userId,
      },
      data: {
        token: signedToken,
      },
    });

    return signedToken;
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
