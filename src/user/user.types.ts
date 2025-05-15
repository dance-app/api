import { Prisma } from '@prisma/client';

const userWithAccount = Prisma.validator<Prisma.UserDefaultArgs>()({
  include: { accounts: true },
});

export type UserWithAccount = Prisma.UserGetPayload<typeof userWithAccount>;
