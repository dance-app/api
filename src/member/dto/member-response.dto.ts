import { DanceRole, WorkspaceRole } from '@prisma/client';

import { PublicUserDto } from '@/user/dto/public-user.dto';

export class MemberResponseDto {
  id: string;
  name: string | null;
  user: PublicUserDto | null;
  roles: WorkspaceRole[];
  level: number | null;
  levelName: string | null;
  preferredDanceRole: DanceRole | null;
  workspaceId: string;
  email: string | null;
  phone: string | null;
}
