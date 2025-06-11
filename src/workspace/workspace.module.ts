import { forwardRef, Module } from '@nestjs/common';

import { WorkspaceController } from './workspace.controller';
import { WorkspaceService } from './workspace.service';

import { MemberModule } from '@/member/member.module';
import { UserModule } from '@/user/user.module';

@Module({
  controllers: [WorkspaceController],
  imports: [forwardRef(() => MemberModule), UserModule],
  providers: [WorkspaceService],
  exports: [WorkspaceService],
})
export class WorkspaceModule {}
