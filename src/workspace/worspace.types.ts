import { Prisma } from '@prisma/client';

const workspaceWithConfig = Prisma.validator<Prisma.WorkspaceDefaultArgs>()({
  include: { configuration: true },
});

const workspaceWithMember = Prisma.validator<Prisma.WorkspaceDefaultArgs>()({
  include: { members: true, configuration: true },
});

export type WorkspaceWithConfig = Prisma.WorkspaceGetPayload<
  typeof workspaceWithConfig
>;
export type WorkspaceWithMember = Prisma.WorkspaceGetPayload<
  typeof workspaceWithMember
>;
