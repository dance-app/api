import { AccountProvider } from '@prisma/client';

export class JwtPayload {
  uid: string; // User ID
  email: string;
  aid: string; // Account id
  provider: AccountProvider;
  isSuperAdmin?: boolean;
  iat?: number; // Issued at
  exp?: number; // Expiration
}
