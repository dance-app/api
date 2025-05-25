import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ description: 'Reset token from email' })
  @IsUUID()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ description: 'New password' })
  @IsString()
  @MinLength(8)
  @IsNotEmpty()
  password: string;
}
