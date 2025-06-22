import { MaterialVisibility } from '@prisma/client';
import { IsArray, IsEnum, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateMaterialDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  videoUrls?: string[];

  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  imageUrls?: string[];

  @IsEnum(MaterialVisibility)
  visibility: MaterialVisibility;

  @IsOptional()
  workspaceId?: number;

  @IsOptional()
  parentMaterialId?: number;

  @IsOptional()
  danceTypeId?: number;
}
