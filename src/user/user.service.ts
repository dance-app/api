import { Injectable } from '@nestjs/common';
import { User, WorkspaceRole } from '@prisma/client';
import { DatabaseService } from 'src/database/database.service';
import { ErrorService } from 'src/error/error.service';
import { PaginationDto } from 'src/pagination/dto';
import { PaginationService } from 'src/pagination/pagination.service';

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

  async create(data: Pick<User, 'fullName'>) {
    try {
      const newUser = await this.database.user.create({
        data: { fullName: data.fullName },
      });

      return {
        message: 'User created',
        data: newUser,
      };
    } catch (error) {
      return this.error.handler(error);
    }
  }

  async update(id: number, data: Pick<User, 'fullName'>) {
    try {
      const updatedUser = await this.database.user.update({
        where: { id },
        data: {
          fullName: data.fullName,
        },
      });

      return {
        message: 'User updated',
        data: updatedUser,
      };
    } catch (error) {
      return this.error.handler(error);
    }
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

  async linkWorkspace(id: number, workspaceId: number) {
    try {
      const updatedUser = await this.database.user.update({
        where: { id },
        data: {
          workspaces: {
            connectOrCreate: {
              create: {
                workspaceId,
                roles: [WorkspaceRole.STUDENT],
              },
              where: {
                userId_workspaceId: {
                  userId: id,
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
