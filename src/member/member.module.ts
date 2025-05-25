import { Module } from '@nestjs/common';

import { MemberController } from './member.controller';
import { MemberService } from './member.service';

import { WorkspaceService } from '@/workspace/workspace.service';

@Module({
  controllers: [MemberController],
  providers: [MemberService, WorkspaceService],
})
export class MemberModule {}
