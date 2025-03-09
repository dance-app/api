import { Injectable } from '@nestjs/common';
import { Account, AccountProvider, User, WorkspaceRole } from '@prisma/client';
import * as argon from 'argon2';
import { DatabaseService } from 'src/database/database.service';
import { ErrorService } from 'src/error/error.service';
import { PaginationDto } from 'src/pagination/dto';
import { PaginationService } from 'src/pagination/pagination.service';

import { CreateUserDto, UpdateUserDto } from './dto';

@Injectable({})
export class UserService {
  constructor(
    private database: DatabaseService,
    private pagination: PaginationService,
    private error: ErrorService,
  ) {}

  async readAll(paginationOptions: PaginationDto) {
    try {
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
    } catch (error) {
      return this.error.handler(error);
    }
  }

  async readById(data: Pick<User, 'id'>) {
    try {
      const user = await this.database.user.findFirst({
        where: { id: data.id },
      });

      return {
        data: user,
      };
    } catch (error) {
      return this.error.handler(error);
    }
  }

  async create(data: CreateUserDto) {
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
          },
        },
      },
      include: {
        accounts: true,
      },
    });

    return newUser;
  }

  async update(id: number, data: UpdateUserDto) {
    const updatedUser = await this.database.user.update({
      where: { id },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        isSuperAdmin: data.isSuperAdmin,
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

  async delete(id: number) {
    try {
      const deletedUser = await this.database.user.delete({
        where: { id },
      });

      return {
        message: 'User deleted',
        data: deletedUser,
      };
    } catch (error) {
      return this.error.handler(error);
    }
  }

  async linkWorkspace(userId: number, workspaceId: number) {
    try {
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
    } catch (error) {
      console.log('error', error);
      return this.error.handler(error);
    }
  }
}
