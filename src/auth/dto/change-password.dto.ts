import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, MinLength } from 'class-validator';

import { MOCK_USER } from '@/lib/constants';

export class ChangePasswordDto {
  @ApiProperty({
    description:
      'Id of the LOCAL account of the user that needs its password changed',
    example: MOCK_USER.JOHN.id,
  })
  @IsNumber()
  @IsNotEmpty()
  accountId: number;

  @ApiProperty({
    description: 'Current password that will be changed',
    example: MOCK_USER.JOHN.password,
  })
  @IsString()
  newPassword: string;

  @ApiProperty({
    description: 'Current password that will be changed',
    example: MOCK_USER.JOHN.password,
  })
  @IsString()
  @MinLength(8)
  currentPassword: string;
}
