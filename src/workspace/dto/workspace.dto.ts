import { IsNotEmpty, IsString } from 'class-validator';

export class WorkspaceDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}
