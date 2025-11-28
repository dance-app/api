import { ApiProperty } from '@nestjs/swagger';
import { AccountProvider } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

import { MOCK_USER, ERROR_MESSAGES } from '@/lib/constants';

export class SignUpDto {
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
  @MinLength(8, { message: ERROR_MESSAGES.MIN_8_CHARACTERS })
  @IsOptional() // Optional for OAuth
  password?: string;

  @ApiProperty({
    description: 'User first name',
    example: MOCK_USER.JOHN.firstName,
  })
  @IsString()
  firstName: string;

  @ApiProperty({
    description: 'User last name',
    example: MOCK_USER.JOHN.lastName,
  })
  @IsString()
  lastName: string;

  @ApiProperty({
    description: 'Account provider',
    enum: AccountProvider,
    default: AccountProvider.LOCAL,
  })
  @IsEnum(AccountProvider)
  @IsOptional()
  provider?: AccountProvider;
}
