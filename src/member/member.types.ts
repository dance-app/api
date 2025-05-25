import { Prisma } from '@prisma/client';

const memberWithUser = Prisma.validator<Prisma.MemberDefaultArgs>()({
  include: { user: true },
});

export type MemberWithUser = Prisma.MemberGetPayload<typeof memberWithUser>;
