import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';

import { AuthService } from './auth.service';
import {
  SignInDto,
  SignInResponseDto,
  SignUpDto,
  UserResponseDto,
} from './dto';

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
}
