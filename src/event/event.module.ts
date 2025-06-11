import { Module } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';

import { EventController } from './event.controller';
import { EventService } from './event.service';

import { AuthModule } from '@/auth/auth.module';
import { AuthService } from '@/auth/auth.service';
import { DatabaseModule } from '@/database/database.module';
import { DatabaseService } from '@/database/database.service';
import { MailModule } from '@/mail/mail.module';
import { MailService } from '@/mail/mail.service';
import { MemberModule } from '@/member/member.module';
import { MemberService } from '@/member/member.service';
import { PaginationModule } from '@/pagination/pagination.module';
import { PaginationService } from '@/pagination/pagination.service';
import { UserModule } from '@/user/user.module';
import { UserService } from '@/user/user.service';
import { WorkspaceModule } from '@/workspace/workspace.module';
import { WorkspaceService } from '@/workspace/workspace.service';

@Module({
  imports: [
    DatabaseModule,
    PaginationModule,
    MemberModule,
    WorkspaceModule,
    UserModule,
    AuthModule,
    JwtModule,
    MailModule,
  ],
  controllers: [EventController],
  providers: [EventService],
  exports: [EventService],
})
export class EventModule {}
