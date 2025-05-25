import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
  Patch,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { AuthService } from './auth.service';
import { GetAuthUser } from './decorator';
import {
  RefreshTokenDto,
  SignInDto,
  SignInResponseDto,
  SignUpDto,
} from './dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SafeUserDto } from './dto/safe-user.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { JwtGuard } from './guard/jwt.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('sign-up')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Sign up a new user' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'User created successfully',
    type: SignInResponseDto,
  })
  async signUp(@Body() dto: SignUpDto) {
    const tokens = await this.authService.signUp(dto);
    return tokens;
  }

  @Post('sign-in')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign in user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User signed in successfully',
    type: SignInResponseDto,
  })
  async signIn(@Body() dto: SignInDto) {
    const token = await this.authService.signIn(dto);
    return token;
  }

  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Token refreshed successfully',
  })
  async refreshToken(
    @Body() dto: RefreshTokenDto,
  ): Promise<{ accessToken: string }> {
    return this.authService.refreshJWToken(dto.refreshToken);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request a password reset email' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Password reset email sent',
  })
  async forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    await this.authService.forgotPassword(forgotPasswordDto);
    return {
      message:
        'If an account with that email exists, a password reset link has been sent.',
    };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Password reset successfully',
  })
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    await this.authService.resetPassword(resetPasswordDto);
    return {
      message:
        'Password has been reset successfully. You can now log in with your new password.',
    };
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email with token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Email verified successfully',
  })
  async verifyEmail(
    @Body() verifyEmailDto: VerifyEmailDto,
  ): Promise<{ message: string }> {
    await this.authService.verifyEmail(verifyEmailDto);
    return {
      message:
        'Email verified successfully. You can now log in to your account.',
    };
  }

  /*@Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend verification email' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Verification email resent',
  })
  async resendVerification(
    @Body('email') email: string,
  ): Promise<{ message: string }> {
    // TODO: current implementation allows to know if a email is used or not. Not ideal from a security perspective.
    await this.authService.resendVerificationEmail(email);
    return { message: 'Verification email has been resent.' };
  }*/

  @Get('me')
  @UseGuards(JwtGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user profile' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User profile retrieved',
    type: SafeUserDto,
  })
  async getMe(@GetAuthUser('id') userId: number): Promise<SafeUserDto> {
    return this.authService.getUserProfile(userId);
  }

  @Patch('change-password')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change password for authenticated user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Password changed successfully',
  })
  async changePassword(
    @GetAuthUser('id') userId: number,
    @Body()
    changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    await this.authService.changePassword(userId, changePasswordDto);
    return { message: 'Password changed successfully' };
  }
}
