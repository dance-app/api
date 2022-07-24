import { ForbiddenException, Injectable } from '@nestjs/common';
import { AccountProvider } from '@prisma/client';
import * as argon from 'argon2';
import { DatabaseService } from 'src/database/database.service';

import { AuthDto } from './dto';

@Injectable({})
export class AuthService {
  constructor(private database: DatabaseService) {}

  async signUp(authDto: AuthDto) {
    const existingAccount = await this.database.account.findFirst({
      where: {
        provider: AccountProvider.LOCAL,
        email: authDto.email,
      },
    });

    if (existingAccount) throw new ForbiddenException('Already signed up');

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

    if (!account) throw new ForbiddenException('Account not found');

    const isPasswordCorrect = await argon.verify(
      account.password,
      authDto.password,
    );

    if (!isPasswordCorrect)
      throw new ForbiddenException('Credentials not correct');

    const user = await this.database.user.findUnique({
      where: {
        id: account.userId,
      },
      include: {
        accounts: true,
      },
    });

    if (!user) throw new ForbiddenException('User not found');

    return user;
  }
}
