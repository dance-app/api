import { Module } from '@nestjs/common';

import { InvitationController } from './invitation.controller';
import { InvitationService } from './invitation.service';

import { DatabaseModule } from '@/database/database.module';
import { MailModule } from '@/mail/mail.module';
import { MemberService } from '@/member/member.service';
import { WorkspaceModule } from '@/workspace/workspace.module';
import { WorkspaceService } from '@/workspace/workspace.service';

@Module({
  imports: [DatabaseModule, MailModule, WorkspaceModule],
  controllers: [InvitationController],
  providers: [InvitationService, WorkspaceService, MemberService],
  exports: [InvitationService],
})
export class InvitationModule {}
