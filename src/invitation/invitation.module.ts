import { Module } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';

import { InvitationController } from './invitation.controller';
import { InvitationService } from './invitation.service';

import { AuthModule } from '@/auth/auth.module';
import { AuthService } from '@/auth/auth.service';
import { DatabaseModule } from '@/database/database.module';
import { EventModule } from '@/event/event.module';
import { EventService } from '@/event/event.service';
import { MailModule } from '@/mail/mail.module';
import { MemberModule } from '@/member/member.module';
import { MemberService } from '@/member/member.service';
import { UserModule } from '@/user/user.module';
import { UserService } from '@/user/user.service';
import { WorkspaceModule } from '@/workspace/workspace.module';
import { WorkspaceService } from '@/workspace/workspace.service';

@Module({
  imports: [
    DatabaseModule,
    MailModule,
    WorkspaceModule,
    EventModule,
    AuthModule,
    JwtModule,
    UserModule,
    MemberModule,
  ],
  controllers: [InvitationController],
  providers: [InvitationService],
  exports: [InvitationService],
})
export class InvitationModule {}
