import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsString()
  password: string;

  @IsBoolean()
  @IsOptional()
  isSuperAdmin: boolean;

  @IsBoolean()
  @IsOptional()
  isVerified: boolean;
}

export class UpdateUserDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsString()
  password: string;

  @IsBoolean()
  @IsOptional()
  isSuperAdmin: boolean;

  @IsBoolean()
  @IsOptional()
  isVerified: boolean;
}

export class UserDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;
}
