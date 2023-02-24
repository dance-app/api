import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { PingModule } from './ping/user.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    // AuthModule,
    ConfigModule.forRoot({ isGlobal: true }),
    // DatabaseModule,
    // UserModule,
    PingModule,
  ],
})
export class AppModule {}
