import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Delete,
  UseGuards,
  NotFoundException,
  ParseIntPipe,
} from '@nestjs/common';
import { GetAuthUser } from 'src/auth/decorator';
import { JwtGuard } from 'src/auth/guard';
import { MemberService } from 'src/member/member.service';
import { GetPagination } from 'src/pagination/decorator';
import { PaginationDto } from 'src/pagination/dto';
import { UserDto } from 'src/user/dto';
import { UserService } from 'src/user/user.service';
import { UserWithAccount } from 'src/user/user.types';

import { WorkspaceDto } from './dto';
import { CanViewWorkspaceGuard } from './guard';
import { WorkspaceService } from './workspace.service';
@UseGuards(JwtGuard)
@Controller('workspaces')
export class WorkspaceController {
  constructor(
    private workspaceService: WorkspaceService,
    private memberService: MemberService,
    private userService: UserService,
  ) {}

  @Post('')
  create(@Body() data: WorkspaceDto) {
    return this.workspaceService.create(data);
  }

  @Get('')
  getAll(@GetPagination() paginationOptions: PaginationDto) {
    return this.workspaceService.readAll(paginationOptions);
  }

  @Get('mine')
  getMyWorkspace(@GetAuthUser() user: UserWithAccount) {
    return this.workspaceService.readMyWorkspaces({ user });
  }

  @Get('slug/:slug')
  @UseGuards(CanViewWorkspaceGuard)
  getBySlug(@Param('slug') slug: string) {
    return this.workspaceService.readBySlug({ slug });
  }

  @Get('slug/:slug/members')
  @UseGuards(CanViewWorkspaceGuard)
  async getWorkspaceMembers(
    @Param('slug') slug: string,
    @GetPagination() paginationOptions: PaginationDto,
  ) {
    const workspaceResponse = await this.workspaceService.readBySlug({ slug });

    if (!workspaceResponse?.data?.id)
      throw new NotFoundException('Workspace not found');

    const memberResponse = await this.memberService.readAll(
      workspaceResponse.data.id,
      paginationOptions,
    );
    return memberResponse;
  }

  @Post('slug/:slug/members')
  @UseGuards(CanViewWorkspaceGuard)
  async createWorkspaceMembers(
    @Param('slug') slug: string,
    @Body() data: UserDto,
  ) {
    const newUserResponse = await this.userService.create({
      fullName: data.fullName,
    });
    const workspace = await this.workspaceService.readBySlug({ slug });
    await this.userService.linkWorkspace(
      newUserResponse.data.id,
      workspace.data.id,
    );
    return newUserResponse;
  }

  @Get('slug/:slug/members/:memberId')
  @UseGuards(CanViewWorkspaceGuard)
  async readWorkspaceMember(
    // @Param('slug') slug: string,
    @Param('memberId', ParseIntPipe) memberId: number,
  ) {
    const userResponse = await this.userService.readById({
      id: memberId,
    });
    return userResponse;
  }

  @Patch('slug/:slug/members/:memberId')
  @UseGuards(CanViewWorkspaceGuard)
  async updateWorkspaceMember(
    // @Param('slug') slug: string,
    @Param('memberId', ParseIntPipe) memberId: number,
    @Body() data: UserDto,
  ) {
    const userResponse = await this.userService.update(memberId, data);
    return userResponse;
  }

  @Get(':id')
  @UseGuards(CanViewWorkspaceGuard)
  getById(@Param('id') id: string) {
    return this.workspaceService.readById({ id: Number(id) });
  }

  @Patch(':id')
  @UseGuards(CanViewWorkspaceGuard)
  update(@Param('id') id: string, @Body() data: WorkspaceDto) {
    return this.workspaceService.update(Number(id), data);
  }

  @Delete(':id')
  @UseGuards(CanViewWorkspaceGuard)
  delete(@Param('id') id: string) {
    return this.workspaceService.delete(Number(id));
  }
}
