import { AccountProvider } from '@prisma/client';

export class JwtPayload {
  uid: number; // User ID
  email: string;
  aid: number; // Account id
  provider: AccountProvider;
  isSuperAdmin?: boolean;
  iat?: number; // Issued at
  exp?: number; // Expiration
}
