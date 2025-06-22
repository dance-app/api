import { MaterialVisibility } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

import { PaginationDto } from '@/pagination/dto';

export class SearchMaterialsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(MaterialVisibility)
  visibility?: MaterialVisibility;

  @IsOptional()
  workspaceId?: number;

  @IsOptional()
  createdById?: number;

  @IsOptional()
  parentMaterialId?: number;

  @IsOptional()
  danceTypeId?: number;
}
