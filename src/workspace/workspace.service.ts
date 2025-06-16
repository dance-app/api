import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { WeekStart, Workspace, WorkspaceRole, Prisma } from '@prisma/client';

import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { WorkspaceResponseDto } from './dto/workspace-response.dto';
import { WorkspaceWithConfig, WorkspaceWithMember } from './worspace.types';

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

  toDto(
    workspace: WorkspaceWithMember | Workspace | WorkspaceWithConfig,
  ): WorkspaceResponseDto {
    const dto: WorkspaceResponseDto = {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      createdAt: workspace.createdAt,
      updatedAt: workspace.updatedAt,
      configuration:
        'configuration' in workspace && workspace.configuration
          ? {
              id: workspace.configuration.id,
              weekStart: workspace.configuration.weekStart,
            }
          : null,
    };

    // Add members count if members are included
    if ('members' in workspace && workspace.members) {
      dto.membersCount = workspace.members.length;
    }

    return dto;
  }

  toDtoList(
    workspaces: (WorkspaceWithMember | Workspace | WorkspaceWithConfig)[],
  ): WorkspaceResponseDto[] {
    return workspaces.map((workspace) => this.toDto(workspace));
  }

  async readAll(paginationOptions: PaginationDto) {
    const totalCount = await this.database.workspace.count({
      where: { deletedAt: null },
    });
    const data = await this.database.workspace.findMany({
      where: { deletedAt: null },
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
      where: {
        id: payload.id,
        deletedAt: null,
      },
    });

    return {
      data,
    };
  }

  async readMyWorkspaces(user: UserWithAccount) {
    const result = await this.database.workspace.findMany({
      where: {
        deletedAt: null,
        members: {
          some: {
            userId: user.id,
          },
        },
      },
    });
    return {
      data: result,
    };
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  async createWithOwner(
    createWorkspaceDto: CreateWorkspaceDto,
    createdById: number, // Owner or Super admin ID
    ownerId?: number, // Assigned owner ID
  ) {
    const { name, slug, weekStart } = createWorkspaceDto;

    // Generate slug if not provided
    const workspaceSlug = slug || this.generateSlug(name);

    // Check if slug is unique (including soft-deleted workspaces)
    const existingWorkspace = await this.database.workspace.findFirst({
      where: {
        slug: workspaceSlug,
        deletedAt: null,
      },
    });

    if (existingWorkspace) {
      throw new ConflictException(
        `Workspace with slug ${workspaceSlug} already exists`,
      );
    }

    ownerId = ownerId || createdById;

    // Verify owner exists
    const owner = await this.database.user.findUnique({
      where: { id: ownerId },
    });

    if (!owner) {
      throw new NotFoundException(`User with ID ${ownerId} not found`);
    }

    return await this.database.$transaction(async (prisma) => {
      // Create workspace
      const workspace = await prisma.workspace.create({
        data: {
          name,
          slug: workspaceSlug,
          createdById: createdById, // Super admin ID as creator
          configuration: {
            create: {
              weekStart: weekStart || WeekStart.MONDAY,
            },
          },
        },
      });

      // Add specified user as owner
      await prisma.member.create({
        data: {
          createdById,
          userId: ownerId,
          workspaceId: workspace.id,
          roles: [WorkspaceRole.OWNER],
        },
      });

      // Transform to DTO before returning
      return this.toDto(workspace);
    });
  }
  async create(payload: CreateWorkspaceDto, ownerUserId: number) {
    return await this.createWithOwner(payload, ownerUserId);
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
    // Check if workspace exists and is not already deleted
    const workspace = await this.database.workspace.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!workspace) {
      throw new NotFoundException(`Workspace with ID ${id} not found`);
    }

    // Soft delete the workspace
    const data = await this.database.workspace.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    return {
      message: 'Workspace deleted',
      data,
    };
  }

  /**
   * Find a workspace by its slug (doesn't throw exceptions)
   * @param slug The workspace slug
   * @returns The workspace or null if not found
   */
  async findWorkspaceBySlug(slug: string, include?: Prisma.WorkspaceInclude) {
    return this.database.workspace.findFirst({
      where: {
        slug,
        deletedAt: null,
      },
      include,
    });
  }

  /**
   * Get a workspace by its slug (throws exception if not found)
   * @param slug The workspace slug
   * @returns The workspace
   * @throws NotFoundException if workspace not found
   */
  async getWorkspaceBySlug(slug: string) {
    const workspace = await this.findWorkspaceBySlug(slug);

    if (!workspace) {
      throw new NotFoundException(`Workspace with slug "${slug}" not found`);
    }

    return this.toDto(workspace);
  }

  async canAccessWorkspace(user: UserWithAccount, slug: string) {
    const workspace = await this.database.workspace.findFirst({
      where: {
        slug,
        deletedAt: null,
      },
    });

    if (!workspace) return false;

    if (user.isSuperAdmin) return true;

    const result = await this.database.workspace.findFirst({
      where: {
        deletedAt: null,
        members: {
          some: {
            userId: user.id,
            workspaceId: workspace.id,
          },
        },
      },
    });
    return !!result;
  }
}
