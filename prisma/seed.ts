import { faker } from '@faker-js/faker';
import {
  PrismaClient,
  AccountProvider,
  WeekStart,
  WorkspaceRole,
  DanceRole,
  AttendanceType,
  DanceTypeEnum,
  DanceCategory,
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

  // Create 5 dance types first
  const danceTypes = await prisma.danceType.createManyAndReturn({
    data: [
      {
        name: 'Salsa',
        type: DanceTypeEnum.SALSA,
        category: DanceCategory.LATIN,
        description: 'A lively Latin dance with Cuban origins',
      },
      {
        name: 'Bachata',
        type: DanceTypeEnum.BACHATA,
        category: DanceCategory.LATIN,
        description: 'A romantic Latin dance from the Dominican Republic',
      },
      {
        name: 'Kizomba',
        type: DanceTypeEnum.KIZOMBA,
        category: DanceCategory.LATIN,
        description: 'A sensual dance from Angola',
      },
      {
        name: 'Tango',
        type: DanceTypeEnum.TANGO,
        category: DanceCategory.BALLROOM,
        description: 'A passionate ballroom dance from Argentina',
      },
      {
        name: 'Waltz',
        type: DanceTypeEnum.WALTZ,
        category: DanceCategory.BALLROOM,
        description: 'An elegant ballroom dance in 3/4 time',
      },
    ],
  });

  const workspaceA = await prisma.workspace.create({
    data: {
      name: 'Studio A',
      slug: 'studio-a',
      createdById: ownerA.id,
      configuration: {
        create: {
          weekStart: WeekStart.MONDAY,
        },
      },
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

  // Connect dance types to workspace A's configuration
  await prisma.$executeRaw`
    INSERT INTO "_workspaceDanceTypes" ("A", "B")
    SELECT dt.id, wc.id 
    FROM "dance_types" dt, "workspaceConfig" wc 
    WHERE wc."workspaceId" = ${workspaceA.id}
    AND dt.id IN (${danceTypes[0].id}, ${danceTypes[1].id}, ${danceTypes[2].id}, ${danceTypes[3].id}, ${danceTypes[4].id})
  `;

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
