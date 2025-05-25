import { UserWithAccount } from '@/user/user.types';

export class UserCreatedEvent {
  constructor(
    public readonly user: UserWithAccount,
    public readonly email: string,
  ) {}
}
