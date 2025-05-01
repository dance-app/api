import { Injectable } from '@nestjs/common';
import { Workspace } from '@prisma/client';

import { DatabaseService } from '@/database/database.service';
import { PaginationDto } from '@/pagination/dto';
import { PaginationService } from '@/pagination/pagination.service';
import { UserWithAccount } from '@/user/user.types';

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
    const data = await this.database.workspace.findFirst({
      where: { id: payload.id },
    });

    return {
      data,
    };
  }

  async readBySlug(payload: Pick<Workspace, 'slug'>) {
    const data = await this.database.workspace.findFirst({
      where: { slug: payload.slug },
    });

    return {
      data,
    };
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
  }

  async update(id: number, payload: Pick<Workspace, 'name'>) {
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
  }

  async delete(id: number) {
    const data = await this.database.workspace.delete({
      where: { id },
    });

    return {
      message: 'User deleted',
      data,
    };
  }

  async canAccessWorkspace(payload: { user: UserWithAccount; slug: string }) {
    const workspace = await this.database.workspace.findFirst({
      where: {
        slug: {
          equals: payload.slug,
        },
      },
    });

    if (!workspace) return false;

    const result = await this.database.workspace.findFirst({
      where: {
        members: {
          some: {
            userId: payload.user.id,
            workspaceId: workspace.id,
          },
        },
      },
    });

    return !!result.id;
  }
}
