import { forwardRef, Module } from '@nestjs/common';

import { MemberController } from './member.controller';
import { MemberService } from './member.service';

import { WorkspaceModule } from '@/workspace/workspace.module';

@Module({
  controllers: [MemberController],
  imports: [forwardRef(() => WorkspaceModule)],
  providers: [MemberService],
  exports: [MemberService],
})
export class MemberModule {}
