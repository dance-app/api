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
  workspaceId?: string;

  @IsOptional()
  createdById?: string;

  @IsOptional()
  parentMaterialId?: string;

  @IsOptional()
  danceTypeId?: string;
}
