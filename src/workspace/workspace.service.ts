import { Injectable } from '@nestjs/common';
import { Workspace } from '@prisma/client';
import { DatabaseService } from 'src/database/database.service';
import { PaginationDto } from 'src/pagination/dto';
import { PaginationService } from 'src/pagination/pagination.service';

@Injectable({})
export class WorkspaceService {
  constructor(
    private database: DatabaseService,
    private pagination: PaginationService,
  ) {}

  async readAll(paginationOptions: PaginationDto) {
    const totalCount = await this.database.workspace.count();
    const data = await this.database.workspace.findMany({
      ...this.pagination.extractPaginationOptions(paginationOptions),
    });

    return {
      meta: {
        totalCount,
        count: data.length,
        ...paginationOptions,
      },
      data,
    };
  }

  async readById(payload: Pick<Workspace, 'id'>) {
    try {
      const data = await this.database.workspace.findFirst({
        where: { id: payload.id },
      });

      return {
        data,
      };
    } catch (error) {
      console.log('Error', error);
      return null;
    }
  }

  async create(payload: Pick<Workspace, 'name'>) {
    try {
      const data = await this.database.workspace.create({
        data: {
          name: payload.name,
        },
      });

      return {
        message: 'Workspace created',
        data,
      };
    } catch (error) {
      console.log('Error', error);
      return null;
    }
  }

  async update(id: number, payload: Pick<Workspace, 'name'>) {
    try {
      const data = await this.database.workspace.update({
        where: { id },
        data: {
          name: payload.name,
        },
      });

      return {
        message: 'User updated',
        data,
      };
    } catch (error) {
      console.log('Error', error);
      return null;
    }
  }

  async delete(id: number) {
    try {
      const data = await this.database.workspace.delete({
        where: { id },
      });

      return {
        message: 'User deleted',
        data,
      };
    } catch (error) {
      console.log('Error', error);
      return null;
    }
  }
}
