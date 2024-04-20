import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { DatabaseService } from 'src/database/database.service';

@Injectable({})
export class UserService {
  constructor(private database: DatabaseService) {}

  async readAll() {
    const users = await this.database.user.findMany();

    return {
      count: users.length,
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
