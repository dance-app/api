import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Delete,
} from '@nestjs/common';
import { GetPagination } from 'src/pagination/decorator';
import { PaginationDto } from 'src/pagination/dto';

import { WorkspaceDto } from './dto';
import { WorkspaceService } from './workspace.service';

@Controller('workspace')
export class WorkspaceController {
  constructor(private workspaceService: WorkspaceService) {}

  @Post('')
  create(@Body() data: WorkspaceDto) {
    return this.workspaceService.create(data);
  }

  @Get('')
  getAll(@GetPagination() paginationOptions: PaginationDto) {
    return this.workspaceService.readAll(paginationOptions);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.workspaceService.readById({ id: Number(id) });
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: WorkspaceDto) {
    return this.workspaceService.update(Number(id), data);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.workspaceService.delete(Number(id));
  }
}
