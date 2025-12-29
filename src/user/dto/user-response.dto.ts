import { AccountProvider } from '@prisma/client';

export class SafeAccountDto {
  id: string;
  email: string;
  provider: AccountProvider;
  isEmailVerified: boolean | null;
  createdAt: Date;
  updatedAt: Date;
}

export class UserResponseDto {
  id: string;
  firstName: string | null;
  lastName: string | null;
  isSuperAdmin: boolean | null;
  createdAt: Date;
  updatedAt: Date;
  accounts?: SafeAccountDto[];
}
