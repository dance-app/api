import { forwardRef, Module } from '@nestjs/common';

import { WorkspaceController } from './workspace.controller';
import { WorkspaceService } from './workspace.service';

import { MaterialModule } from '@/material/material.module';
import { MemberModule } from '@/member/member.module';
import { UserModule } from '@/user/user.module';

@Module({
  controllers: [WorkspaceController],
  imports: [forwardRef(() => MemberModule), UserModule, MaterialModule],
  providers: [WorkspaceService],
  exports: [WorkspaceService],
})
export class WorkspaceModule {}
