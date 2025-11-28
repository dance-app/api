import { WeekStart } from '@prisma/client';

export class WorkspaceConfigDto {
  id: string;
  weekStart: WeekStart;
}

export class WorkspaceResponseDto {
  id: string;
  name: string;
  slug: string | null;
  createdAt: Date;
  updatedAt: Date;
  configuration: WorkspaceConfigDto | null;
  membersCount?: number;
}
