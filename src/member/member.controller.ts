import {
  Controller,
  Get,
  Post,
  UseGuards,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Member, Workspace } from '@prisma/client';

import { MemberService } from './member.service';

import { JwtGuard } from '@/auth/guard';
import { GetPagination } from '@/pagination/decorator';
import { PaginationDto } from '@/pagination/dto';
import { RolesGuard } from '@/role/guard/roles.guard';

@ApiBearerAuth()
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
    @Query('workspaceId', ParseIntPipe) workspaceId: number,
    @GetPagination() paginationOptions: PaginationDto,
  ) {
    return this.memberService.readAll(workspaceId, paginationOptions);
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
