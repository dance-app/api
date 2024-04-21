import { User, Account } from '@prisma/client';

export type UserAccount = Account;

export type UserWithAccount = User & {
  account: Omit<Account, 'password'>;
};
