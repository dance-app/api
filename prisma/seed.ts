import { faker } from '@faker-js/faker';
import {
  PrismaClient,
  AccountProvider,
  WeekStart,
  WorkspaceRole,
  DanceRole,
  AttendanceType,
} from '@prisma/client';
import * as argon2 from 'argon2';

import { MOCK_USER } from '@/lib/constants';

const prisma = new PrismaClient();

// helper to create a user + local account
async function createUser(opts: {
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  isSuperAdmin?: boolean;
  isVerified?: boolean;
}) {
  const hash = await argon2.hash(opts.password ?? 'admin');

  return prisma.user.create({
    data: {
      firstName: opts.firstName,
      lastName: opts.lastName,
      isSuperAdmin: opts.isSuperAdmin ?? false,
      accounts: {
        create: {
          provider: AccountProvider.LOCAL,
          email: opts.email,
          password: hash,
          isEmailVerified: opts.isVerified ?? true,
        },
      },
    },
    include: { accounts: true },
  });
}

async function main() {
  // ------------------------------------------------------------------
  // Global users
  // ------------------------------------------------------------------
  await createUser({
    firstName: MOCK_USER.JOHN.firstName,
    lastName: MOCK_USER.JOHN.lastName,
    email: MOCK_USER.JOHN.email,
    password: MOCK_USER.JOHN.password,
    isSuperAdmin: MOCK_USER.JOHN.isSuperAdmin,
  });

  await createUser({
    firstName: MOCK_USER.JANE.firstName,
    lastName: MOCK_USER.JANE.lastName,
    email: MOCK_USER.JANE.email,
    password: MOCK_USER.JANE.password,
    isSuperAdmin: MOCK_USER.JANE.isSuperAdmin,
  });

  // ------------------------------------------------------------------
  // Workspace A setup
  // ------------------------------------------------------------------
  const ownerA = await createUser({
    firstName: 'Alice',
    lastName: 'Admin',
    email: 'alice.admin@studio-a.com',
  });

  const workspaceA = await prisma.workspace.create({
    data: {
      name: 'Studio A',
      slug: 'studio-a',
      createdById: ownerA.id,
      configuration: { create: { weekStart: WeekStart.MONDAY } },
      members: {
        createMany: {
          data: [
            {
              userId: ownerA.id,
              createdById: ownerA.id,
              roles: [WorkspaceRole.OWNER],
            },
          ],
        },
      },
    },
  });

  // 3 random members in workspace A
  const usersA = await Promise.all(
    Array.from({ length: 3 }).map(() =>
      createUser({
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        email: faker.internet.email(),
      }),
    ),
  );
  const membersA = await prisma.member.createManyAndReturn({
    data: usersA.map((m) => ({
      userId: m.id,
      createdById: ownerA.id,
      workspaceId: workspaceA.id,
      roles: [WorkspaceRole.STUDENT],
    })),
  });

  // Events in workspace A
  for (let i = 0; i < 2; i++) {
    const dateStart = faker.date.soon({ days: 7 });
    const event = await prisma.event.create({
      data: {
        name: `Studio A – Class ${i + 1}`,
        description: faker.lorem.sentence(),
        dateStart,
        dateEnd: new Date(dateStart.getTime() + 60 * 60 * 1000),
        organizerId: workspaceA.id,
        rule: [],
      },
    });

    // every student attends
    await prisma.attendee.createMany({
      data: membersA.map((m, idx) => ({
        memberId: m.id,
        eventId: event.id,
        role: idx % 2 === 0 ? DanceRole.LEADER : DanceRole.FOLLOWER,
        type: AttendanceType.VALIDATE,
      })),
    });
  }

  // ------------------------------------------------------------------
  // Workspace B setup
  // ------------------------------------------------------------------
  const ownerB = await createUser({
    firstName: 'Bob',
    lastName: 'Boss',
    email: 'bob.boss@studio-b.com',
  });

  const workspaceB = await prisma.workspace.create({
    data: {
      name: 'Studio B',
      slug: 'studio-b',
      createdById: ownerB.id,
      configuration: { create: { weekStart: WeekStart.SUNDAY } },
      members: {
        create: [
          {
            userId: ownerB.id,
            createdById: ownerB.id,
            roles: [WorkspaceRole.OWNER],
          },
        ],
      },
    },
  });

  // 2 random members in workspace B
  const membersB = await Promise.all(
    Array.from({ length: 2 }).map(() =>
      createUser({
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        email: faker.internet.email(),
      }),
    ),
  );
  await prisma.member.createMany({
    data: membersB.map((m) => ({
      userId: m.id,
      createdById: ownerB.id,
      workspaceId: workspaceB.id,
      roles: [WorkspaceRole.STUDENT],
    })),
  });

  console.info('Seed finished with 2 workspaces, 7 users 🌱');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
