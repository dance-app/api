import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { DEFAULT_PAGE_SIZE } from 'src/constants';
import { DatabaseService } from 'src/database/database.service';

import { PaginationDto } from './dto';

@Injectable({})
export class UserService {
  constructor(private database: DatabaseService) {}

  async readAll(pagination: PaginationDto) {
    const userCount = await this.database.user.count();
    const users = await this.database.user.findMany({
      skip: pagination.offset ?? DEFAULT_PAGE_SIZE.offset,
      take: pagination.limit ?? DEFAULT_PAGE_SIZE.limit,
    });

    return {
      meta: {
        totalCount: userCount,
        count: users.length,
        ...pagination,
      },
      data: users,
    };
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
      console.log('Error', error);
      return null;
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
      console.log('Error', error);
      return null;
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
      console.log('Error', error);
      return null;
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
      console.log('Error', error);
      return null;
    }
  }
}
