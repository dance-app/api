import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ErrorService } from 'src/error/error.service';

import { AuthService } from './auth.service';
import { SignInDto, SignUpDto } from './dto';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private errorService: ErrorService,
  ) {}

  @Post('sign-up')
  async signUp(@Body() data: SignUpDto) {
    // return this.authService.signUp(data);
    try {
      const result = await this.authService.signUp(data);

      if (!result.id) throw new Error('Unauthorized');

      const exposedUser = result;

      // const tokenEmail = await this.sendEmail(exposedUser, 'validate-email');

      return {
        statusCode: 201,
        message: 'Successfully signed up',
        data: {
          ...exposedUser,
        },
        // ...(this.isDevMode() ? { tokenSentByEmail: tokenEmail } : {}),
      };
    } catch (error: any) {
      return this.errorService.handler(error);
    }
  }

  @HttpCode(HttpStatus.OK)
  @Post('sign-in')
  signIn(@Body() data: SignInDto) {
    return this.authService.signIn(data);
  }
}
