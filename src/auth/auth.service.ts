import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AccountProvider, WorkspaceRole } from '@prisma/client';
import * as argon from 'argon2';
import { DatabaseService } from 'src/database/database.service';
import { ApiError } from 'src/types';

import { SignInDto, SignUpDto } from './dto';

@Injectable({})
export class AuthService {
  constructor(
    private database: DatabaseService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async signUp(data: SignUpDto) {
    try {
      const existingAccount = await this.database.account.findFirst({
        where: {
          provider: AccountProvider.LOCAL,
          email: data.email,
        },
      });

      if (existingAccount)
        throw new ForbiddenException(ApiError.ACCOUNT_ALREADY_EXISTS);

      const hash = await argon.hash(data.password);
      const user = await this.database.user.create({
        data: {
          fullName: data.fullName,
          accounts: {
            create: {
              provider: AccountProvider.LOCAL,
              email: data.email,
              password: hash,
            },
          },
          workspaces: {
            create: {
              workspace: {
                create: {
                  name: `${data.fullName}'s workspace`,
                },
              },
              roles: [WorkspaceRole.STUDENT],
            },
          },
        },
        include: {
          accounts: true,
        },
      });

      return {
        message: 'Sign up successfully',
        data: user,
      };
    } catch (error) {
      return error.response;
    }
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
      return error.response;
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
