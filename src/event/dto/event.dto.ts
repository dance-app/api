import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsDateString,
  IsOptional,
  IsArray,
} from 'class-validator';

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  @IsNotEmpty()
  dateStart: string;

  @IsOptional()
  @IsDateString()
  dateEnd?: string;

  @IsOptional()
  @IsString()
  recurrenceRule?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsNumber()
  capacityMin?: number;

  @IsOptional()
  @IsNumber()
  capacityMax?: number;

  @IsOptional()
  @IsNumber()
  leaderOffset?: number;

  @IsOptional()
  @IsNumber()
  followerOffset?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  rule?: number[];

  @IsNumber()
  @IsNotEmpty()
  organizerId: number;
}
