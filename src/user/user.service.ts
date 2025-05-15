import { Injectable } from '@nestjs/common';
import { Account, AccountProvider, User, WorkspaceRole } from '@prisma/client';
import * as argon from 'argon2';

import { UpdateUserDto } from './dto';

import { DatabaseService } from '@/database/database.service';
import { PaginationDto } from '@/pagination/dto';
import { PaginationService } from '@/pagination/pagination.service';

@Injectable({})
export class UserService {
  constructor(
    private database: DatabaseService,
    private pagination: PaginationService,
  ) {}

  async readAll(paginationOptions: PaginationDto) {
    const userCount = await this.database.user.count();
    const users = await this.database.user.findMany({
      ...this.pagination.extractPaginationOptions(paginationOptions),
    });

    return {
      meta: {
        totalCount: userCount,
        count: users.length,
        ...paginationOptions,
      },
      data: users,
    };
  }

  async readById(data: Pick<User, 'id'>) {
    const user = await this.database.user.findFirst({
      where: { id: data.id },
    });

    return {
      data: user,
    };
  }

  /*async create(data: CreateUserDto) {
    let emailToken = null;
    if (!data.isVerified) {
      const expiredAt = new Date();
      expiredAt.setHours(expiredAt.getHours() + 24);
      emailToken = {
        create: {
          expiresAt: expiredAt,
          token: uuid.uuid4(),
        }
      };
    }
    const newUser = await this.database.user.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        isSuperAdmin: data.isSuperAdmin || false,
        accounts: {
          create: {
            provider: AccountProvider.LOCAL,
            email: data.email,
            password: await argon.hash(data.password),
            isEmailVerified: data.isVerified || false,
            emailToken: emailToken,
          },
        },
      },
      include: {
        accounts: true,
      },
    });

    return newUser;
  }*/

  async update(id: number, data: UpdateUserDto) {
    const updatedUser = await this.database.user.update({
      where: { id },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
      },
      include: { accounts: true },
    });

    let updatedAccount: Account | undefined;

    if (data.password || data.isVerified) {
      const updatedUserLocalAccount = updatedUser.accounts.find(
        (a) => a.provider === AccountProvider.LOCAL,
      );
      if (!updatedUserLocalAccount) throw new Error('User account not found');

      const newPassword = data.password
        ? await argon.hash(data.password)
        : null;

      updatedAccount = await this.database.account.update({
        where: {
          id: updatedUserLocalAccount.id,
        },
        data: {
          ...(newPassword ? { password: newPassword } : {}),
          ...(data.isVerified ? { isEmailVerified: data.isVerified } : {}),
        },
      });
    }

    return {
      user: updatedUser,
      account: updatedAccount,
    };
  }

  async readByEmail(email: string): Promise<User | null> {
    const account = await this.database.account.findFirst({
      where: { email },
      include: { user: true },
    });

    return account?.user;
  }

  async delete(id: number) {
    const deletedUser = await this.database.user.delete({
      where: { id },
    });

    return {
      message: 'User deleted',
      data: deletedUser,
    };
  }

  async linkWorkspace(userId: number, workspaceId: number) {
    const updatedUser = await this.database.user.update({
      where: { id: userId },
      data: {
        workspaces: {
          connectOrCreate: {
            create: {
              workspaceId,
              roles: [WorkspaceRole.STUDENT],
            },
            where: {
              userId_workspaceId: {
                userId,
                workspaceId,
              },
            },
          },
        },
      },
    });

    return {
      message: 'User linked to workspace',
      data: {
        workspaceId,
        userId: updatedUser.id,
      },
    };
  }
}
