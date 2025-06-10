import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { DanceService } from './dance.service';
import { CreateDanceTypeDto, UpdateDanceTypeDto } from './dto';

import { JwtGuard } from '@/auth/guard';
import { GetPagination } from '@/pagination/decorator';
import { PaginationDto } from '@/pagination/dto';

@ApiTags('dance')
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller('dance')
export class DanceController {
  constructor(private danceService: DanceService) {}

  @Post('')
  @ApiOperation({ summary: 'Create a new dance type' })
  async createDanceType(@Body() dto: CreateDanceTypeDto) {
    return this.danceService.createDanceType(dto);
  }

  @Get('')
  @ApiOperation({ summary: 'Get all dance types with pagination' })
  async findAllDanceTypes(@GetPagination() pagination: PaginationDto) {
    return this.danceService.findAllDanceTypes(pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a dance type by ID' })
  async findDanceTypeById(@Param('id', ParseIntPipe) id: number) {
    return this.danceService.findDanceTypeById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a dance type' })
  async updateDanceType(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDanceTypeDto,
  ) {
    return this.danceService.updateDanceType(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a dance type' })
  async deleteDanceType(@Param('id', ParseIntPipe) id: number) {
    await this.danceService.deleteDanceType(id);
    return { message: 'Dance type deleted successfully' };
  }

  // Workspace relationship endpoints
  @Post(':id/workspaces/:workspaceId')
  @ApiOperation({ summary: 'Link a dance type to a workspace' })
  async linkDanceTypeToWorkspace(
    @Param('id', ParseIntPipe) danceTypeId: number,
    @Param('workspaceId', ParseIntPipe) workspaceId: number,
  ) {
    await this.danceService.linkDanceTypeToWorkspace(danceTypeId, workspaceId);
    return { message: 'Dance type linked to workspace successfully' };
  }

  @Delete('types/:id/workspaces/:workspaceId')
  @ApiOperation({ summary: 'Unlink a dance type from a workspace' })
  async unlinkDanceTypeFromWorkspace(
    @Param('id', ParseIntPipe) danceTypeId: number,
    @Param('workspaceId', ParseIntPipe) workspaceId: number,
  ) {
    await this.danceService.unlinkDanceTypeFromWorkspace(
      danceTypeId,
      workspaceId,
    );
    return { message: 'Dance type unlinked from workspace successfully' };
  }
}
