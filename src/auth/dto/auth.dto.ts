import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

import { MOCK_USER } from '@/lib/constants';

export class SignInDto {
  @ApiProperty({ example: MOCK_USER.JOHN.email })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: MOCK_USER.JOHN.password })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class SignUpDto {
  @ApiProperty({ example: MOCK_USER.JOHN.email })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: MOCK_USER.JOHN.password })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({ example: MOCK_USER.JOHN.firstName })
  @IsString()
  firstName: string;

  @ApiProperty({ example: MOCK_USER.JOHN.lastName })
  @IsString()
  lastName: string;
}

export class UserResponseDto {
  constructor(partial: Partial<UserResponseDto>) {
    Object.assign(this, partial);
  }

  @ApiProperty()
  id: number;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  email: string;

  @Exclude()
  token?: string; // never expose
}

export class SignInResponseDto {
  constructor(data: SignInResponseDto) {
    Object.assign(this, data);
  }

  @ApiProperty()
  token: string;
}
