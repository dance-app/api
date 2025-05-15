import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

import { MOCK_USER } from '@/lib/constants';

export class ForgotPasswordDto {
  @ApiProperty({
    description: 'User email address',
    example: MOCK_USER.JOHN.email,
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
