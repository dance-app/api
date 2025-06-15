import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { validate } from './env.validation';
import { EventModule } from './event/event.module';
import { InvitationModule } from './invitation/invitation.module';
import { MaterialModule } from './material/material.module';
import { MemberModule } from './member/member.module';
import { PaginationModule } from './pagination/pagination.module';
import { PingModule } from './ping/ping.module';
import { UserModule } from './user/user.module';
import { WorkspaceModule } from './workspace/workspace.module';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    AuthModule,
    ConfigModule.forRoot({
      envFilePath: [`.env.${process.env.NODE_ENV || 'dev'}`],
      validate,
      isGlobal: true,
    }),
    DatabaseModule,
    EventModule,
    InvitationModule,
    MaterialModule,
    MemberModule,
    PaginationModule,
    PingModule,
    UserModule,
    WorkspaceModule,
  ],
})
export class AppModule {}
