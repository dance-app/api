import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
} from '@nestjs/common';

import { AuthService } from './auth.service';
import { GetAuthUser } from './decorator';
import {
  SignInDto,
  SignInResponseDto,
  SignUpDto,
  UserResponseDto,
} from './dto';
import { JwtGuard } from './guard/jwt.guard';

import { UserWithAccount } from '@/user/user.types';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('sign-up')
  @HttpCode(HttpStatus.CREATED)
  async signUp(@Body() dto: SignUpDto) {
    const user = await this.authService.signUp(dto);
    return new UserResponseDto(user);
  }

  @Post('sign-in')
  @HttpCode(HttpStatus.OK)
  async signIn(@Body() dto: SignInDto) {
    const token = await this.authService.signIn(dto);
    return new SignInResponseDto({ token });
  }

  @Get('me')
  @UseGuards(JwtGuard)
  @HttpCode(HttpStatus.OK)
  async getMe(@GetAuthUser() user: UserWithAccount) {
    // user is already loaded by JwtStrategy.validate()
    return new UserResponseDto(user);
  }
}
