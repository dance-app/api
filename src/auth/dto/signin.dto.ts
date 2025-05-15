import { ApiProperty } from '@nestjs/swagger';
import { AccountProvider } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

import { MOCK_USER } from '@/lib/constants';

export class SignInDto {
  @ApiProperty({
    description: 'User email address',
    example: MOCK_USER.JOHN.email,
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'User password (for email provider)',
    example: MOCK_USER.JOHN.password,
  })
  @IsString()
  @IsOptional() // Optional for OAuth
  password: string;

  @ApiProperty({
    description: 'Account provider',
    enum: AccountProvider,
    default: AccountProvider.LOCAL,
  })
  @IsEnum(AccountProvider)
  @IsOptional()
  provider?: AccountProvider;
}
