import { Module } from '@nestjs/common';

import { WorkspaceController } from './workspace.controller';
import { WorkspaceService } from './workspace.service';

import { MaterialService } from '@/material/material.service';
import { MemberService } from '@/member/member.service';
import { PaginationService } from '@/pagination/pagination.service';
import { UserService } from '@/user/user.service';

@Module({
  controllers: [WorkspaceController],
  providers: [WorkspaceService, MemberService, UserService, MaterialService, PaginationService],
})
export class WorkspaceModule {}
