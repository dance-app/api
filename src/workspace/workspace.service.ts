import { Injectable } from '@nestjs/common';
import { Workspace } from '@prisma/client';
import { DatabaseService } from 'src/database/database.service';
import { ErrorService } from 'src/error/error.service';
import { PaginationDto } from 'src/pagination/dto';
import { PaginationService } from 'src/pagination/pagination.service';
import { UserWithAccount } from 'src/user/user.types';

@Injectable({})
export class WorkspaceService {
  constructor(
    private database: DatabaseService,
    private pagination: PaginationService,
    private error: ErrorService,
  ) {}

  async readAll(paginationOptions: PaginationDto) {
    try {
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
    } catch (error) {
      return this.error.handler(error);
    }
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
      return this.error.handler(error);
    }
  }

  async readBySlug(payload: Pick<Workspace, 'slug'>) {
    try {
      const data = await this.database.workspace.findFirst({
        where: { slug: payload.slug },
      });

      return {
        data,
      };
    } catch (error) {
      return this.error.handler(error);
    }
  }

  async readMyWorkspaces(payload: { user: UserWithAccount }) {
    const result = await this.database.workspace.findMany({
      where: {
        members: {
          some: {
            userId: payload.user.id,
          },
        },
      },
    });
    return {
      data: result,
    };
  }

  async create(payload: Pick<Workspace, 'name' | 'slug'>) {
    try {
      const data = await this.database.workspace.create({
        data: {
          name: payload.name,
          slug: payload.slug,
        },
      });

      return {
        message: 'Workspace created',
        data,
      };
    } catch (error) {
      return this.error.handler(error);
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
      return this.error.handler(error);
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
      return this.error.handler(error);
    }
  }
}
