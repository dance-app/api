import { IsBoolean, IsDateString, IsOptional } from 'class-validator';

export class ShareMaterialDto {
  @IsOptional()
  @IsBoolean()
  canDownload?: boolean;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
