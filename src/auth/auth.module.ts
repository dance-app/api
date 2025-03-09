import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { UserService } from 'src/user/user.service';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwTStrategy } from './strategy';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, JwTStrategy, UserService],
})
export class AuthModule {}
