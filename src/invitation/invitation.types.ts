import { Prisma } from '@prisma/client';

const inviteWithWorkspace = Prisma.validator<Prisma.InvitationDefaultArgs>()({
  include: { workspace: true },
});

const inviteWithInviter = Prisma.validator<Prisma.InvitationDefaultArgs>()({
  include: { inviter: true, workspace: true },
});

export type InviteWithWorkspace = Prisma.InvitationGetPayload<
  typeof inviteWithWorkspace
>;
export type InviteWithInviter = Prisma.InvitationGetPayload<
  typeof inviteWithInviter
>;
