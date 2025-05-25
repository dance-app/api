import { DanceRole, WorkspaceRole } from '@prisma/client';

import { PublicUserDto } from '@/user/dto/public-user.dto';

export class MemberResponseDto {
  id: number;
  name: string | null;
  user: PublicUserDto | null;
  roles: WorkspaceRole[];
  level: number | null;
  levelName: string | null;
  preferedDanceRole: DanceRole | null;
  workspaceId: number;
}
