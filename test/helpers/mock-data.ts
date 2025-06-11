import { faker } from '@faker-js/faker';
import {
  AccountProvider,
  EventVisibility,
  InvitationStatus,
  InviteType,
  User,
  WeekStart,
  WorkspaceRole,
} from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

import { DanceLevel } from '@/member/enums/dance-level.enum';

export interface MockUserDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface CreateUserOptions {
  verifyEmail?: boolean;
  superAdmin?: boolean;
  provider?: AccountProvider;
}

export interface CreateWorkspaceOptions {
  name?: string;
  slug?: string;
  weekStart?: WeekStart;
  members?: Array<{
    user: User;
    roles: WorkspaceRole[];
    name?: string;
    level?: DanceLevel;
  }>;
  createMockStudents?: number;
}

export interface CreateMemberOptions {
  name?: string;
  level?: DanceLevel;
  roles: WorkspaceRole[];
  userId?: number;
}

export interface CreateEventOptions {
  name?: string;
  description?: string;
  dateStart?: Date;
  dateEnd?: Date;
  location?: string;
  visibility?: EventVisibility;
  capacityMin?: number;
  capacityMax?: number;
  organizerIds?: number[];
}

export interface CreateInvitationOptions {
  createdAt?: Date | string;
  updatedAt?: Date | string;
  type: InviteType;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  token: string;
  expiresAt: Date | string;
  status?: InvitationStatus;
}

export class TestDataFactory {
  static createMockUserDto(overrides: Partial<MockUserDto> = {}): MockUserDto {
    return {
      email: faker.internet.email(),
      password: 'TestPassword123!', // Use consistent password for tests
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      ...overrides,
    };
  }

  static createUniqueEmail(prefix = 'test'): string {
    return `${prefix}-${Date.now()}-${faker.number.int(1000)}@example.com`;
  }

  static createUniqueSlug(prefix = 'test'): string {
    return `${prefix}-${Date.now()}-${faker.number.int(1000)}`;
  }

  static createWorkspaceData(
    overrides: Partial<CreateWorkspaceOptions> = {},
  ): CreateWorkspaceOptions {
    const companyName = faker.company.name();
    return {
      name: companyName,
      slug: faker.helpers.slugify(companyName).toLowerCase(),
      weekStart: WeekStart.MONDAY,
      ...overrides,
    };
  }

  static createEventData(
    overrides: Partial<CreateEventOptions> = {},
  ): CreateEventOptions {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(19, 0, 0, 0); // 7 PM

    return {
      name: `${faker.word.adjective()} ${faker.word.noun()} Class`,
      description: faker.lorem.paragraph(),
      dateStart: tomorrow,
      location: `${faker.location.streetAddress()}, ${faker.location.city()}`,
      visibility: EventVisibility.WORKSPACE_ONLY,
      capacityMax: faker.number.int({ min: 10, max: 50 }),
      ...overrides,
    };
  }

  static createInvitationData(
    overrides: Partial<CreateInvitationOptions> = {},
  ): CreateInvitationOptions {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7); // Expires in 7 days

    return {
      token: uuidv4(),
      expiresAt: futureDate,
      status: InvitationStatus.PENDING,
      type: InviteType.WORKSPACE,
      ...overrides,
    };
  }

  static createExpiredInvitationData(
    overrides: Omit<Partial<CreateInvitationOptions>, 'expiresAt'> = {},
  ): CreateInvitationOptions {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1); // Expired yesterday

    return this.createInvitationData({
      expiresAt: pastDate,
      ...overrides,
    });
  }
}
