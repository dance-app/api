import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { ErrorModule } from './error/error.module';
import { EventModule } from './event/event.module';
import { MemberModule } from './member/member.module';
import { PaginationModule } from './pagination/pagination.module';
import { PingModule } from './ping/ping.module';
import { UserModule } from './user/user.module';
import { WorkspaceModule } from './workspace/workspace.module';

@Module({
  imports: [
    AuthModule,
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    ErrorModule,
    EventModule,
    MemberModule,
    PaginationModule,
    PingModule,
    UserModule,
    WorkspaceModule,
  ],
})
export class AppModule {}
