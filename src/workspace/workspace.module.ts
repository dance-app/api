import { Module } from '@nestjs/common';
import { MemberService } from 'src/member/member.service';
import { UserService } from 'src/user/user.service';

import { WorkspaceController } from './workspace.controller';
import { WorkspaceService } from './workspace.service';

@Module({
  controllers: [WorkspaceController],
  providers: [WorkspaceService, MemberService, UserService],
})
export class WorkspaceModule {}
