import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class WorkspaceDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'The name of the workspace',
    example: 'Studio A',
  })
  name: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'The unique slug identifier for the workspace',
    example: 'studio-a',
  })
  slug: string;
}
export class WorkspaceIdQuery {
  @IsString()
  @IsNotEmpty()
  id: string;
}
