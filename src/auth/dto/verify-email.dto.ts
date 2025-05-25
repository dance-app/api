import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({ description: 'Email verification token' })
  @IsUUID()
  @IsNotEmpty()
  token: string;
}
