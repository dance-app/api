import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { DatabaseService } from 'src/database/database.service';

@Injectable({})
export class UserService {
  constructor(private database: DatabaseService) {}

  async readAll() {
    const userCount = await this.database.user.count();

    return {
      count: userCount,
    };
  }

  async create(data: Pick<User, 'fullName'>) {
    const newUser = await this.database.user.create({
      data: { fullName: data.fullName },
    });

    return newUser;
  }
}
