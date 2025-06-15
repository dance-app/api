import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

import {
  CreateMaterialDto,
  UpdateMaterialDto,
  MaterialResponseDto,
  ShareMaterialDto,
  SearchMaterialsDto,
} from './dto';
import { MaterialService } from './material.service';

import { GetAuthUser } from '@/auth/decorator';
import { JwtGuard } from '@/auth/guard';
import { GetPagination } from '@/pagination/decorator';
import { PaginatedResponseDto } from '@/pagination/dto';

@ApiTags('Materials')
@UseGuards(JwtGuard)
@Controller('materials')
export class MaterialController {
  constructor(private materialService: MaterialService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new material' })
  @ApiResponse({ status: 201, type: MaterialResponseDto })
  async createMaterial(
    @Body() createDto: CreateMaterialDto,
    @GetAuthUser('id') userId: number,
  ): Promise<MaterialResponseDto> {
    return this.materialService.createMaterial(createDto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Search materials with pagination' })
  @ApiResponse({ status: 200, type: [MaterialResponseDto] })
  async findMaterials(
    @GetPagination() searchDto: SearchMaterialsDto,
    @GetAuthUser('id') userId: number,
    @GetAuthUser('workspaces') userWorkspaces: any[], // This should be typed based on your auth system
  ): Promise<PaginatedResponseDto<MaterialResponseDto>> {
    const workspaceIds = userWorkspaces?.map((w) => w.workspaceId) || [];
    return this.materialService.findMaterials(searchDto, userId, workspaceIds);
  }

  @Get('shared')
  @ApiOperation({ summary: 'Get materials shared with the current user' })
  @ApiResponse({ status: 200, type: [MaterialResponseDto] })
  async getSharedMaterials(
    @GetAuthUser('id') userId: number,
  ): Promise<MaterialResponseDto[]> {
    return this.materialService.getSharedMaterials(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get material by ID' })
  @ApiResponse({ status: 200, type: MaterialResponseDto })
  async findMaterialById(
    @Param('id') id: string,
    @GetAuthUser('id') userId: number,
    @GetAuthUser('workspaces') userWorkspaces: any[],
  ): Promise<MaterialResponseDto> {
    const workspaceIds = userWorkspaces?.map((w) => w.workspaceId) || [];
    return this.materialService.findMaterialById(+id, userId, workspaceIds);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update material' })
  @ApiResponse({ status: 200, type: MaterialResponseDto })
  async updateMaterial(
    @Param('id') id: string,
    @Body() updateDto: UpdateMaterialDto,
    @GetAuthUser('id') userId: number,
  ): Promise<MaterialResponseDto> {
    return this.materialService.updateMaterial(+id, updateDto, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete material' })
  @ApiResponse({ status: 204 })
  async deleteMaterial(
    @Param('id') id: string,
    @GetAuthUser('id') userId: number,
  ): Promise<void> {
    return this.materialService.deleteMaterial(+id, userId);
  }

  @Post(':id/share/:studentId')
  @ApiOperation({ summary: 'Share material with a student' })
  @ApiResponse({ status: 201 })
  async shareMaterialWithStudent(
    @Param('id') materialId: string,
    @Param('studentId') studentId: string,
    @Body() shareDto: ShareMaterialDto,
    @GetAuthUser('id') userId: number,
  ): Promise<void> {
    return this.materialService.shareMaterialWithStudent(
      +materialId,
      +studentId,
      shareDto,
      userId,
    );
  }

  @Post(':id/view')
  @ApiOperation({ summary: 'Mark material as viewed (for shared materials)' })
  @ApiResponse({ status: 200 })
  async markMaterialAsViewed(
    @Param('id') materialId: string,
    @GetAuthUser('id') userId: number,
  ): Promise<void> {
    return this.materialService.markMaterialAsViewed(+materialId, userId);
  }
}
