import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Delete,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { User, WorkspaceRole } from '@prisma/client';

import { UpdateWorkspaceConfigDto, UpdateWorkspaceDto } from './dto';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import {
  CanViewWorkspaceGuard,
  RequireWorkspaceRoles,
  WorkspaceRolesGuard,
} from './guard';
import { WorkspaceService } from './workspace.service';

import { GetAuthUser } from '@/auth/decorator';
import { JwtGuard } from '@/auth/guard';
import { buildResponse } from '@/lib/api-response';
import { SearchMaterialsDto } from '@/material/dto';
import { MaterialService } from '@/material/material.service';
import { GetPagination } from '@/pagination/decorator';
import { PaginationDto } from '@/pagination/dto';
import { UserWithAccount } from '@/user/user.types';

@ApiTags('Workspaces')
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller('workspaces')
export class WorkspaceController {
  constructor(
    private workspaceService: WorkspaceService,
    private materialService: MaterialService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new workspace' })
  @ApiResponse({ status: 201, description: 'Workspace created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid data or unauthorized' })
  async create(@Body() data: CreateWorkspaceDto, @GetAuthUser() user: User) {
    // If ownerId is provided and user is super admin, create workspace for that user
    if (user.isSuperAdmin) {
      const workspace = await this.workspaceService.createWithOwner(
        data,
        user.id, // createdById (super admin)
        data.ownerId, // ownerId (the assigned owner)
      );
      return buildResponse(workspace);
    }
    if (data.ownerId !== undefined && data.ownerId !== user.id)
      throw new BadRequestException();

    // Regular case - user creates their own workspace
    const workspace = await this.workspaceService.create(data, user.id);
    return buildResponse(workspace);
  }

  @Get()
  @ApiOperation({ summary: 'Get all workspaces' })
  @ApiResponse({ status: 200, description: 'List of workspaces' })
  async getAll(
    @GetAuthUser() user: UserWithAccount,
    @GetPagination() paginationOptions: PaginationDto,
  ) {
    if (user.isSuperAdmin) {
      const result = await this.workspaceService.readAll(paginationOptions);
      return buildResponse(result.data, result.meta);
    }
    const workspaces = await this.workspaceService.readMyWorkspaces(user);
    return buildResponse(workspaces);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get workspace by slug' })
  @ApiParam({ name: 'slug', description: 'Workspace slug' })
  @ApiResponse({ status: 200, description: 'Workspace found' })
  @ApiResponse({ status: 404, description: 'Workspace not found' })
  @UseGuards(CanViewWorkspaceGuard)
  async getBySlug(@Param('slug') slug: string) {
    const workspace = await this.workspaceService.getWorkspaceBySlug(slug);
    return buildResponse(workspace);
  }

  @Patch(':slug')
  @ApiOperation({ summary: 'Update workspace by slug' })
  @ApiParam({ name: 'slug', description: 'Workspace slug' })
  @ApiResponse({ status: 200, description: 'Workspace updated successfully' })
  @ApiResponse({ status: 400, description: 'Workspace not found' })
  @ApiResponse({
    status: 403,
    description: 'Access denied - owner role required',
  })
  @UseGuards(CanViewWorkspaceGuard, WorkspaceRolesGuard)
  @RequireWorkspaceRoles(WorkspaceRole.OWNER)
  async update(@Param('slug') slug: string, @Body() data: UpdateWorkspaceDto) {
    // Check if at least one field is provided
    if (Object.keys(data).length === 0 || !data.name) {
      throw new BadRequestException(
        'At least one field must be provided to update',
      );
    }

    const workspace = await this.workspaceService.getWorkspaceBySlug(slug);
    if (!workspace) {
      throw new BadRequestException(`Workspace with slug "${slug}" not found`);
    }
    const updatedWorkspace = await this.workspaceService.update(
      workspace.id,
      data,
    );
    return buildResponse(updatedWorkspace);
  }

  @Patch(':slug/configuration')
  @ApiOperation({ summary: 'Update workspace configuration' })
  @ApiParam({ name: 'slug', description: 'Workspace slug' })
  @ApiResponse({
    status: 200,
    description: 'Workspace configuration updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Workspace not found' })
  @ApiResponse({
    status: 403,
    description: 'Access denied - owner role required',
  })
  @UseGuards(CanViewWorkspaceGuard, WorkspaceRolesGuard)
  @RequireWorkspaceRoles(WorkspaceRole.OWNER)
  async updateConfiguration(
    @Param('slug') slug: string,
    @Body() configData: UpdateWorkspaceConfigDto,
  ) {
    const config = await this.workspaceService.updateConfiguration(
      slug,
      configData,
    );
    return buildResponse(config);
  }

  @Delete(':slug')
  @ApiOperation({ summary: 'Delete workspace by slug' })
  @ApiParam({ name: 'slug', description: 'Workspace slug' })
  @ApiResponse({ status: 200, description: 'Workspace deleted successfully' })
  @ApiResponse({ status: 400, description: 'Workspace not found' })
  @ApiResponse({
    status: 403,
    description: 'Access denied - owner role required',
  })
  @UseGuards(CanViewWorkspaceGuard, WorkspaceRolesGuard)
  @RequireWorkspaceRoles(WorkspaceRole.OWNER)
  async delete(@Param('slug') slug: string) {
    const workspace = await this.workspaceService.getWorkspaceBySlug(slug);
    if (!workspace) {
      throw new BadRequestException(`Workspace with slug "${slug}" not found`);
    }
    const deletedWorkspace = await this.workspaceService.delete(workspace.id);
    return buildResponse(deletedWorkspace);
  }

  @Get(':slug/materials')
  @ApiOperation({ summary: 'Get materials for a workspace' })
  @ApiParam({ name: 'slug', description: 'Workspace slug' })
  @ApiResponse({ status: 200, description: 'List of workspace materials' })
  @ApiResponse({ status: 400, description: 'Workspace not found' })
  @UseGuards(CanViewWorkspaceGuard)
  async getWorkspaceMaterials(
    @Param('slug') slug: string,
    @GetPagination() searchDto: SearchMaterialsDto,
    @GetAuthUser() user: UserWithAccount,
  ) {
    const workspace = await this.workspaceService.getWorkspaceBySlug(slug);

    if (!workspace) {
      throw new BadRequestException(`Workspace with slug "${slug}" not found`);
    }
    // Set the workspace filter to only show materials for this workspace
    const workspaceSearchDto = {
      ...searchDto,
      workspaceId: workspace.id,
    };

    return this.materialService.findMaterials({
      searchDto: workspaceSearchDto,
      userId: user.id,
      workspaceIds: [workspace.id],
    });
  }
}
