import { Controller, Get, Post, UseGuards, Body, Param } from '@nestjs/common';
import { Member, Workspace } from '@prisma/client';
import { JwtGuard } from 'src/auth/guard';
import { GetPagination } from 'src/pagination/decorator';
import { PaginationDto } from 'src/pagination/dto';
import { RolesGuard } from 'src/role/guard/roles.guard';

import { MemberService } from './member.service';

@UseGuards(JwtGuard, RolesGuard)
@Controller('members')
export class MemberController {
  constructor(private memberService: MemberService) {}

  @Post('')
  create(@Body() data: Member & { workspaceId: Workspace['id'] }) {
    return this.memberService.create(data);
  }

  @Get('')
  readAll(
    @Body() data: { workspaceId: Workspace['id'] },
    @GetPagination() paginationOptions: PaginationDto,
  ) {
    return this.memberService.readAll(data.workspaceId, paginationOptions);
  }

  @Get(':id')
  readById(@Param('id') id: string) {
    return this.memberService.readById(Number(id));
  }

  // @Patch(':id')
  // updateUser(@Param('id') id: string, @Body() data: UserDto) {
  //   return this.memberService.update(Number(id), data);
  // }

  // @Delete(':id')
  // delete(@Param('id') id: string) {
  //   return this.memberService.delete(Number(id));
  // }
}
