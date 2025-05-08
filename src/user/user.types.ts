import { Account, User } from '@prisma/client';

export type UserWithAccount = User & {
  accounts: Omit<Account, 'password'>[];
};
