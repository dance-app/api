import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

import { ERROR_MESSAGES, MOCK_USER } from '@/lib/constants';

export class ChangePasswordDto {
  @ApiProperty({
    description:
      'Id of the LOCAL account of the user that needs its password changed',
    example: MOCK_USER.JOHN.id,
  })
  @IsString()
  @IsNotEmpty()
  accountId: string;

  @ApiProperty({
    description: 'Current password that will be changed',
    example: MOCK_USER.JOHN.password,
  })
  @MinLength(8, { message: ERROR_MESSAGES.MIN_8_CHARACTERS })
  @IsString()
  newPassword: string;

  @ApiProperty({
    description: 'Current password that will be changed',
    example: MOCK_USER.JOHN.password,
  })
  @IsString()
  currentPassword: string;
}
