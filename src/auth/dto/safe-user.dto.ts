import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';

import { SafeAccountDto } from './safe-account.dto';

export class SafeUserDto {
  @ApiProperty({ description: 'User ID' })
  id: string;

  @ApiProperty({ description: 'User first name' })
  firstName: string;

  @ApiProperty({ description: 'User last name' })
  lastName: string;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Super admin flag', required: false })
  isSuperAdmin?: boolean;

  @ApiProperty({ type: [SafeAccountDto] })
  accounts: SafeAccountDto[];

  @Exclude()
  token?: string; // never expose
}
