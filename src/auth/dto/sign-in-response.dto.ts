import { ApiProperty } from '@nestjs/swagger';

import { SafeUserDto } from './safe-user.dto';

export class SignInResponseDto {
  @ApiProperty({ type: SafeUserDto })
  user: SafeUserDto;

  @ApiProperty({ description: 'JWT access token' })
  accessToken: string;

  @ApiProperty({ description: 'JWT refresh token', required: false })
  refreshToken?: string;
}
