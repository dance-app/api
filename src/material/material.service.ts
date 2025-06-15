import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MaterialVisibility, Prisma } from '@prisma/client';

import {
  CreateMaterialDto,
  UpdateMaterialDto,
  MaterialResponseDto,
  ShareMaterialDto,
  SearchMaterialsDto,
} from './dto';

import { DatabaseService } from '@/database/database.service';
import { PaginatedResponseDto } from '@/pagination/dto';
import { PaginationService } from '@/pagination/pagination.service';

@Injectable()
export class MaterialService {
  constructor(
    private database: DatabaseService,
    private pagination: PaginationService,
  ) {}

  // Create a new material
  async createMaterial(
    dto: CreateMaterialDto,
    createdById: number,
  ): Promise<MaterialResponseDto> {
    // Validate workspace access if visibility is WORKSPACE
    if (dto.visibility === MaterialVisibility.WORKSPACE && !dto.workspaceId) {
      throw new ConflictException(
        'Workspace ID is required for workspace visibility',
      );
    }

    // Validate parent material exists and user has access
    if (dto.parentMaterialId) {
      await this.validateParentMaterialAccess(
        dto.parentMaterialId,
        createdById,
      );
    }

    try {
      const material = await this.database.material.create({
        data: {
          name: dto.name,
          description: dto.description,
          videoUrls: dto.videoUrls || [],
          imageUrls: dto.imageUrls || [],
          visibility: dto.visibility,
          createdById,
          workspaceId: dto.workspaceId,
          parentMaterialId: dto.parentMaterialId,
          danceTypeId: dto.danceTypeId,
        },
        include: {
          createdBy: {
            select: { id: true, firstName: true, lastName: true },
          },
          workspace: {
            select: { id: true, name: true, slug: true },
          },
          parentMaterial: {
            select: { id: true, name: true },
          },
          childMaterials: {
            select: { id: true, name: true },
          },
          danceType: {
            select: { id: true, name: true, category: true },
          },
        },
      });

      return new MaterialResponseDto(material);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Material with this name already exists');
        }
      }
      throw error;
    }
  }

  // Find materials with search and filtering
  async findMaterials(
    searchDto: SearchMaterialsDto,
    userId: number,
    workspaceIds: number[] = [],
  ): Promise<PaginatedResponseDto<MaterialResponseDto>> {
    const { skip, take } = this.pagination.extractPaginationOptions(searchDto);

    // Build where clause based on visibility and access
    const whereClause: Prisma.MaterialWhereInput = {
      AND: [
        // Exclude soft-deleted materials
        { deletedAt: null },

        // Search by name or description
        searchDto.search
          ? {
              OR: [
                { name: { contains: searchDto.search, mode: 'insensitive' } },
                {
                  description: {
                    contains: searchDto.search,
                    mode: 'insensitive',
                  },
                },
              ],
            }
          : {},

        // Visibility filter
        searchDto.visibility ? { visibility: searchDto.visibility } : {},

        // Workspace filter
        searchDto.workspaceId ? { workspaceId: searchDto.workspaceId } : {},

        // Creator filter
        searchDto.createdById ? { createdById: searchDto.createdById } : {},

        // Parent material filter
        searchDto.parentMaterialId !== undefined
          ? { parentMaterialId: searchDto.parentMaterialId }
          : {},

        // Dance type filter
        searchDto.danceTypeId ? { danceTypeId: searchDto.danceTypeId } : {},

        // Access control: user can see materials they created, public materials,
        // or workspace materials from their workspaces
        {
          OR: [
            { createdById: userId }, // Own materials
            { visibility: MaterialVisibility.PUBLIC }, // Public materials
            {
              AND: [
                { visibility: MaterialVisibility.WORKSPACE },
                { workspaceId: { in: workspaceIds } },
              ],
            }, // Workspace materials from user's workspaces
          ],
        },
      ],
    };

    const [materials, total] = await Promise.all([
      this.database.material.findMany({
        where: whereClause,
        skip,
        take,
        include: {
          createdBy: {
            select: { id: true, firstName: true, lastName: true },
          },
          workspace: {
            select: { id: true, name: true, slug: true },
          },
          parentMaterial: {
            select: { id: true, name: true },
          },
          childMaterials: {
            select: { id: true, name: true },
          },
          danceType: {
            select: { id: true, name: true, category: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.database.material.count({ where: whereClause }),
    ]);

    const materialDtos = materials.map(
      (material) => new MaterialResponseDto(material),
    );

    return this.pagination.createPaginatedResponse(
      materialDtos,
      total,
      searchDto,
    );
  }

  // Find material by ID with access control
  async findMaterialById(
    id: number,
    userId: number,
    workspaceIds: number[] = [],
  ): Promise<MaterialResponseDto> {
    const material = await this.database.material.findFirst({
      where: {
        id,
        deletedAt: null, // Exclude soft-deleted materials
      },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        workspace: {
          select: { id: true, name: true, slug: true },
        },
        parentMaterial: {
          select: { id: true, name: true },
        },
        childMaterials: {
          select: { id: true, name: true },
        },
      },
    });

    if (!material) {
      throw new NotFoundException(`Material with ID ${id} not found`);
    }

    // Check access permissions
    const hasAccess =
      material.createdById === userId || // Creator
      material.visibility === MaterialVisibility.PUBLIC || // Public
      (material.visibility === MaterialVisibility.WORKSPACE &&
        material.workspaceId &&
        workspaceIds.includes(material.workspaceId)); // Workspace member

    if (!hasAccess) {
      throw new ForbiddenException('Access denied to this material');
    }

    return new MaterialResponseDto(material);
  }

  // Update material
  async updateMaterial(
    id: number,
    dto: UpdateMaterialDto,
    userId: number,
  ): Promise<MaterialResponseDto> {
    const existingMaterial = await this.database.material.findFirst({
      where: {
        id,
        deletedAt: null, // Exclude soft-deleted materials
      },
    });

    if (!existingMaterial) {
      throw new NotFoundException(`Material with ID ${id} not found`);
    }

    // Only creator can update
    if (existingMaterial.createdById !== userId) {
      throw new ForbiddenException('Only the creator can update this material');
    }

    // Validate parent material if being changed
    if (
      dto.parentMaterialId !== undefined &&
      dto.parentMaterialId !== existingMaterial.parentMaterialId
    ) {
      if (dto.parentMaterialId) {
        await this.validateParentMaterialAccess(dto.parentMaterialId, userId);
      }
    }

    try {
      const material = await this.database.material.update({
        where: { id },
        data: {
          ...(dto.name && { name: dto.name }),
          ...(dto.description !== undefined && {
            description: dto.description,
          }),
          ...(dto.videoUrls !== undefined && { videoUrls: dto.videoUrls }),
          ...(dto.imageUrls !== undefined && { imageUrls: dto.imageUrls }),
          ...(dto.visibility && { visibility: dto.visibility }),
          ...(dto.workspaceId !== undefined && {
            workspaceId: dto.workspaceId,
          }),
          ...(dto.parentMaterialId !== undefined && {
            parentMaterialId: dto.parentMaterialId,
          }),
          ...(dto.danceTypeId !== undefined && {
            danceTypeId: dto.danceTypeId,
          }),
        },
        include: {
          createdBy: {
            select: { id: true, firstName: true, lastName: true },
          },
          workspace: {
            select: { id: true, name: true, slug: true },
          },
          parentMaterial: {
            select: { id: true, name: true },
          },
          childMaterials: {
            select: { id: true, name: true },
          },
          danceType: {
            select: { id: true, name: true, category: true },
          },
        },
      });

      return new MaterialResponseDto(material);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Material with this name already exists');
        }
      }
      throw error;
    }
  }

  // Soft delete material
  async deleteMaterial(id: number, userId: number): Promise<void> {
    const material = await this.database.material.findFirst({
      where: {
        id,
        deletedAt: null, // Exclude already soft-deleted materials
      },
    });

    if (!material) {
      throw new NotFoundException(`Material with ID ${id} not found`);
    }

    // Only creator can delete
    if (material.createdById !== userId) {
      throw new ForbiddenException('Only the creator can delete this material');
    }

    // Soft delete the material
    await this.database.material.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  // Share material with a student
  async shareMaterialWithStudent(
    materialId: number,
    studentId: number,
    shareDto: ShareMaterialDto,
    sharedById: number,
  ): Promise<void> {
    // Verify material exists and user has access
    const material = await this.database.material.findFirst({
      where: {
        id: materialId,
        deletedAt: null, // Exclude soft-deleted materials
      },
    });

    if (!material) {
      throw new NotFoundException(`Material with ID ${materialId} not found`);
    }

    if (material.createdById !== sharedById) {
      throw new ForbiddenException('Only the creator can share this material');
    }

    // Create or update share record
    await this.database.materialStudentShare.upsert({
      where: {
        materialId_studentId: {
          materialId,
          studentId,
        },
      },
      create: {
        materialId,
        studentId,
        sharedById,
        canDownload: shareDto.canDownload || false,
        expiresAt: shareDto.expiresAt ? new Date(shareDto.expiresAt) : null,
      },
      update: {
        canDownload: shareDto.canDownload,
        expiresAt: shareDto.expiresAt ? new Date(shareDto.expiresAt) : null,
      },
    });
  }

  // Get materials shared with a student
  async getSharedMaterials(studentId: number): Promise<MaterialResponseDto[]> {
    const shares = await this.database.materialStudentShare.findMany({
      where: {
        studentId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        material: {
          deletedAt: null, // Only include shares of non-deleted materials
        },
      },
      include: {
        material: {
          include: {
            createdBy: {
              select: { id: true, firstName: true, lastName: true },
            },
            workspace: {
              select: { id: true, name: true, slug: true },
            },
            parentMaterial: {
              select: { id: true, name: true },
            },
            childMaterials: {
              select: { id: true, name: true },
            },
            danceType: {
              select: { id: true, name: true, category: true },
            },
          },
        },
      },
    });

    return shares.map((share) => new MaterialResponseDto(share.material));
  }

  // Mark material as viewed by student
  async markMaterialAsViewed(
    materialId: number,
    studentId: number,
  ): Promise<void> {
    await this.database.materialStudentShare.updateMany({
      where: {
        materialId,
        studentId,
      },
      data: {
        viewedAt: new Date(),
      },
    });
  }

  // Private helper methods
  private async validateParentMaterialAccess(
    parentMaterialId: number,
    userId: number,
  ): Promise<void> {
    const parentMaterial = await this.database.material.findFirst({
      where: {
        id: parentMaterialId,
        deletedAt: null, // Exclude soft-deleted materials
      },
    });

    if (!parentMaterial) {
      throw new NotFoundException(
        `Parent material with ID ${parentMaterialId} not found`,
      );
    }

    // User must have access to the parent material
    if (
      parentMaterial.createdById !== userId &&
      parentMaterial.visibility === MaterialVisibility.PRIVATE
    ) {
      throw new ForbiddenException('Access denied to parent material');
    }
  }
}
