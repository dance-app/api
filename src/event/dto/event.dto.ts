import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsDateString,
  IsOptional,
} from 'class-validator';

export class EventDto {
  @IsNumber()
  @IsNotEmpty()
  id: number;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  @IsNotEmpty()
  dateStart: string;

  @IsOptional()
  @IsDateString()
  dateEnd?: string;

  @IsDateString()
  @IsNotEmpty()
  timezone: string;

  @IsOptional()
  @IsString()
  recurrenceRule?: string;
}
