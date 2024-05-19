import { IsNotEmpty, IsString } from 'class-validator';

export class WorkspaceDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  slug: string;
}
export class WorkspaceIdQuery {
  @IsString()
  @IsNotEmpty()
  id: string;
}
