import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { EventModule } from './event/event.module';
import { PaginationModule } from './pagination/pagination.module';
import { PingModule } from './ping/ping.module';
import { UserModule } from './user/user.module';
import { WorkspaceModule } from './workspace/workspace.module';

@Module({
  imports: [
    AuthModule,
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    EventModule,
    PingModule,
    UserModule,
    PaginationModule,
    WorkspaceModule,
  ],
})
export class AppModule {}
