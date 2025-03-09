import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AccountProvider } from '@prisma/client';
import * as argon from 'argon2';
import { DatabaseService } from 'src/database/database.service';
import { ErrorService } from 'src/error/error.service';
import { ApiError } from 'src/error/error.types';
import { UserService } from 'src/user/user.service';

import { SignInDto, SignUpDto } from './dto';

@Injectable({})
export class AuthService {
  constructor(
    private database: DatabaseService,
    private jwt: JwtService,
    private config: ConfigService,
    private error: ErrorService,
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

    if (existingAccount)
      throw new ForbiddenException(ApiError.ACCOUNT_ALREADY_EXISTS);

    const user = await this.userService.create({
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      password: data.password,
      isSuperAdmin: false,
      isVerified: false,
    });

    return user;
  }

  async signIn(data: SignInDto) {
    try {
      const account = await this.database.account.findFirst({
        where: {
          provider: AccountProvider.LOCAL,
          email: data.email,
        },
      });

      if (!account) throw new ForbiddenException(ApiError.ACCOUNT_NOT_FOUND);
      // if (!account) throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);

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

      return {
        data: {
          message: 'Successfully logged in',
          token: signedToken,
        },
      };
    } catch (error) {
      return this.error.handler(error);
    }
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
