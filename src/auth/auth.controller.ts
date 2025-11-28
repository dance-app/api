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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse as SwaggerApiResponse,
} from '@nestjs/swagger';

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
import { ApiResponse, buildResponse } from '../lib/api-response';

import { SUCCESS_MESSAGES } from '@/lib/constants';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('sign-up')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Sign up a new user' })
  @SwaggerApiResponse({
    status: HttpStatus.CREATED,
    description: 'User created successfully',
    type: SignInResponseDto,
  })
  async signUp(
    @Body() dto: SignUpDto,
  ): Promise<ApiResponse<SignInResponseDto>> {
    const tokens = await this.authService.signUp(dto);
    return buildResponse(tokens);
  }

  @Post('sign-in')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign in user' })
  @SwaggerApiResponse({
    status: HttpStatus.OK,
    description: 'User signed in successfully',
    type: SignInResponseDto,
  })
  async signIn(
    @Body() dto: SignInDto,
  ): Promise<ApiResponse<SignInResponseDto>> {
    const token = await this.authService.signIn(dto);
    return buildResponse(token);
  }

  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @SwaggerApiResponse({
    status: HttpStatus.OK,
    description: 'Token refreshed successfully',
  })
  async refreshToken(
    @Body() dto: RefreshTokenDto,
  ): Promise<ApiResponse<{ accessToken: string }>> {
    const data = await this.authService.refreshJWToken(dto.refreshToken);
    return buildResponse(data);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request a password reset email' })
  @SwaggerApiResponse({
    status: HttpStatus.OK,
    description: 'Password reset email sent',
  })
  async forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
  ): Promise<ApiResponse<{ message: string }>> {
    await this.authService.forgotPassword(forgotPasswordDto);
    return buildResponse({
      message: SUCCESS_MESSAGES.PASSWORD_RESET_EMAIL_SENT,
    });
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  @SwaggerApiResponse({
    status: HttpStatus.OK,
    description: 'Password reset successfully',
  })
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
  ): Promise<ApiResponse<{ message: string }>> {
    await this.authService.resetPassword(resetPasswordDto);
    return buildResponse({
      message: SUCCESS_MESSAGES.PASSWORD_RESET_SUCCESS,
    });
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email with token' })
  @SwaggerApiResponse({
    status: HttpStatus.OK,
    description: 'Email verified successfully',
  })
  async verifyEmail(
    @Body() verifyEmailDto: VerifyEmailDto,
  ): Promise<ApiResponse<{ message: string }>> {
    const verifyResponse = await this.authService.verifyEmail(verifyEmailDto);
    if (verifyResponse?.success) {
      return buildResponse({
        message: SUCCESS_MESSAGES.EMAIL_VERIFIED_SUCCESS,
      });
    }
    return buildResponse({
      message: SUCCESS_MESSAGES.EMAIL_VERIFIED_SUCCESS,
    });
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
  @SwaggerApiResponse({
    status: HttpStatus.OK,
    description: 'User profile retrieved',
    type: SafeUserDto,
  })
  async getMe(
    @GetAuthUser('id') userId: string,
  ): Promise<ApiResponse<SafeUserDto>> {
    const profile = await this.authService.getUserProfile(userId);
    return buildResponse(profile);
  }

  @Patch('change-password')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change password for authenticated user' })
  @SwaggerApiResponse({
    status: HttpStatus.OK,
    description: 'Password changed successfully',
  })
  async changePassword(
    @GetAuthUser('id') userId: string,
    @Body()
    changePasswordDto: ChangePasswordDto,
  ): Promise<ApiResponse<{ message: string }>> {
    await this.authService.changePassword(userId, changePasswordDto);
    return buildResponse({
      message: SUCCESS_MESSAGES.PASSWORD_CHANGED_SUCCESS,
    });
  }
}
