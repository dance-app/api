import { Account, User } from '@prisma/client';

export type JwtStrategyPayload = {
  sub: User['id'];
  email: Account['email'];
  iat: number;
  exp: number;
};
