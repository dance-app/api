import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateWorkspaceDto {
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  @IsOptional()
  @ApiProperty({
    description: 'The name of the workspace',
    example: 'Studio A',
    required: false,
  })
  name?: string;
}
