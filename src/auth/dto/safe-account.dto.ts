import { ApiProperty } from '@nestjs/swagger';
import { AccountProvider } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class SafeAccountDto {
  @ApiProperty({ description: 'Account ID' })
  id: string;

  @ApiProperty({ description: 'Account provider', enum: AccountProvider })
  @IsEnum(AccountProvider)
  provider: AccountProvider;

  @ApiProperty({ description: 'Email address' })
  email: string;

  @ApiProperty({ description: 'Email verification status' })
  isEmailVerified: boolean;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;
}
