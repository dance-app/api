import { WeekStart } from '@prisma/client';

export class WorkspaceConfigDto {
  id: number;
  weekStart: WeekStart;
}

export class WorkspaceResponseDto {
  id: number;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
  configuration: WorkspaceConfigDto;
  membersCount?: number;
}
