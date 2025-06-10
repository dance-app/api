import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DanceType, Prisma } from '@prisma/client';

import { CreateDanceTypeDto, UpdateDanceTypeDto } from './dto';

import { DatabaseService } from '@/database/database.service';
import { PaginatedResponseDto, PaginationDto } from '@/pagination/dto';
import { PaginationService } from '@/pagination/pagination.service';

@Injectable()
export class DanceService {
  constructor(
    private database: DatabaseService,
    private pagination: PaginationService,
  ) {}

  // DanceType CRUD operations
  async createDanceType(dto: CreateDanceTypeDto): Promise<DanceType> {
    try {
      return await this.database.danceType.create({
        data: {
          name: dto.name,
          type: dto.type,
          category: dto.category,
          description: dto.description,
        },
        include: {
          workspaceConfigs: {
            select: {
              id: true,
              workspace: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException(
            'Dance type with this name already exists',
          );
        }
      }
      throw error;
    }
  }

  async findAllDanceTypes(
    pagination: PaginationDto,
  ): Promise<PaginatedResponseDto<DanceType>> {
    const { skip, take } = this.pagination.extractPaginationOptions(pagination);

    const [danceTypes, total] = await Promise.all([
      this.database.danceType.findMany({
        skip,
        take,
        include: {
          workspaceConfigs: {
            select: {
              id: true,
              workspace: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
        },
        orderBy: {
          name: 'asc',
        },
      }),
      this.database.danceType.count(),
    ]);

    return this.pagination.createPaginatedResponse(
      danceTypes,
      total,
      pagination,
    );
  }

  async findDanceTypeById(id: number): Promise<DanceType> {
    const danceType = await this.database.danceType.findUnique({
      where: { id },
      include: {
        workspaceConfigs: {
          select: {
            id: true,
            workspace: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    if (!danceType) {
      throw new NotFoundException(`Dance type with ID ${id} not found`);
    }

    return danceType;
  }

  async updateDanceType(
    id: number,
    dto: UpdateDanceTypeDto,
  ): Promise<DanceType> {
    await this.findDanceTypeById(id); // Check if exists

    try {
      return await this.database.danceType.update({
        where: { id },
        data: {
          ...(dto.name && { name: dto.name }),
          ...(dto.type && { type: dto.type }),
          ...(dto.category !== undefined && { category: dto.category }),
          ...(dto.description !== undefined && {
            description: dto.description,
          }),
        },
        include: {
          workspaceConfigs: {
            select: {
              id: true,
              workspace: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException(
            'Dance type with this name already exists',
          );
        }
      }
      throw error;
    }
  }

  async deleteDanceType(id: number): Promise<void> {
    await this.findDanceTypeById(id); // Check if exists

    try {
      await this.database.danceType.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2003') {
          throw new ConflictException(
            'Cannot delete dance type that has associated events or member preferences',
          );
        }
      }
      throw error;
    }
  }

  // Workspace relationships
  async linkDanceTypeToWorkspace(
    danceTypeId: number,
    workspaceId: number,
  ): Promise<void> {
    await this.findDanceTypeById(danceTypeId); // Verify dance type exists

    await this.database.danceType.update({
      where: { id: danceTypeId },
      data: {
        workspaceConfigs: {
          connect: { id: workspaceId },
        },
      },
    });
  }

  async unlinkDanceTypeFromWorkspace(
    danceTypeId: number,
    workspaceId: number,
  ): Promise<void> {
    await this.findDanceTypeById(danceTypeId); // Verify dance type exists

    await this.database.danceType.update({
      where: { id: danceTypeId },
      data: {
        workspaceConfigs: {
          disconnect: { id: workspaceId },
        },
      },
    });
  }
}
