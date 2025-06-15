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
  MaterialVisibility,
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
  // System User and Public Materials
  // ------------------------------------------------------------------
  const systemUser = await createUser({
    firstName: MOCK_USER.SYSTEM.firstName,
    lastName: MOCK_USER.SYSTEM.lastName,
    email: MOCK_USER.SYSTEM.email,
    password: MOCK_USER.SYSTEM.password,
    isSuperAdmin: MOCK_USER.SYSTEM.isSuperAdmin,
  });

  // Create dance types first
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

  // Find dance types by their enum type for materials
  const salsaDanceType = danceTypes.find(
    (dt) => dt.type === DanceTypeEnum.SALSA,
  );
  const bachataDanceType = danceTypes.find(
    (dt) => dt.type === DanceTypeEnum.BACHATA,
  );
  const tangoDanceType = danceTypes.find(
    (dt) => dt.type === DanceTypeEnum.TANGO,
  );
  const waltzDanceType = danceTypes.find(
    (dt) => dt.type === DanceTypeEnum.WALTZ,
  );

  // Create basic public dance moves that everyone can use
  const publicMaterials = await Promise.all([
    // Basic Salsa moves
    prisma.material.create({
      data: {
        name: 'Basic Salsa Step',
        description:
          'The fundamental salsa step - forward and back basic pattern with timing on 1-2-3, 5-6-7',
        videoUrls: [],
        imageUrls: [],
        visibility: MaterialVisibility.PUBLIC,
        createdById: systemUser.id,
        danceTypeId: salsaDanceType?.id,
      },
    }),
    prisma.material.create({
      data: {
        name: 'Salsa Cross Body Lead',
        description:
          'Essential salsa move where the leader guides the follower across their body',
        videoUrls: [],
        imageUrls: [],
        visibility: MaterialVisibility.PUBLIC,
        createdById: systemUser.id,
        danceTypeId: salsaDanceType?.id,
      },
    }),
    prisma.material.create({
      data: {
        name: 'Salsa Right Turn',
        description:
          'Basic right turn for followers in salsa, led from cross body lead position',
        videoUrls: [],
        imageUrls: [],
        visibility: MaterialVisibility.PUBLIC,
        createdById: systemUser.id,
        danceTypeId: salsaDanceType?.id,
      },
    }),

    // Basic Bachata moves
    prisma.material.create({
      data: {
        name: 'Basic Bachata Step',
        description:
          'The fundamental bachata step - side to side with hip movement and tap on 4 and 8',
        videoUrls: [],
        imageUrls: [],
        visibility: MaterialVisibility.PUBLIC,
        createdById: systemUser.id,
        danceTypeId: bachataDanceType?.id,
      },
    }),
    prisma.material.create({
      data: {
        name: 'Bachata Side Step',
        description:
          'Basic side step pattern in bachata with proper hip motion',
        videoUrls: [],
        imageUrls: [],
        visibility: MaterialVisibility.PUBLIC,
        createdById: systemUser.id,
        danceTypeId: bachataDanceType?.id,
      },
    }),

    // Basic Tango moves
    prisma.material.create({
      data: {
        name: 'Tango Walk',
        description:
          'The fundamental tango walk with proper posture and connection',
        videoUrls: [],
        imageUrls: [],
        visibility: MaterialVisibility.PUBLIC,
        createdById: systemUser.id,
        danceTypeId: tangoDanceType?.id,
      },
    }),
    prisma.material.create({
      data: {
        name: 'Tango Ocho Cortado',
        description:
          'Basic tango figure - interrupted eight, fundamental movement pattern',
        videoUrls: [],
        imageUrls: [],
        visibility: MaterialVisibility.PUBLIC,
        createdById: systemUser.id,
        danceTypeId: tangoDanceType?.id,
      },
    }),

    // Basic Waltz moves
    prisma.material.create({
      data: {
        name: 'Waltz Box Step',
        description:
          'The fundamental waltz box step in 3/4 time - forward, side, together pattern',
        videoUrls: [],
        imageUrls: [],
        visibility: MaterialVisibility.PUBLIC,
        createdById: systemUser.id,
        danceTypeId: waltzDanceType?.id,
      },
    }),
    prisma.material.create({
      data: {
        name: 'Waltz Natural Turn',
        description:
          'Basic waltz natural turn (right turn) with proper rise and fall',
        videoUrls: [],
        imageUrls: [],
        visibility: MaterialVisibility.PUBLIC,
        createdById: systemUser.id,
        danceTypeId: waltzDanceType?.id,
      },
    }),

    // General technique materials
    prisma.material.create({
      data: {
        name: 'Dance Frame and Posture',
        description:
          'Fundamental dance posture and frame for partner dancing - applies to all dance styles',
        videoUrls: [],
        imageUrls: [],
        visibility: MaterialVisibility.PUBLIC,
        createdById: systemUser.id,
      },
    }),
    prisma.material.create({
      data: {
        name: 'Basic Rhythm and Timing',
        description:
          'Understanding musical timing and how to count beats in different dance styles',
        videoUrls: [],
        imageUrls: [],
        visibility: MaterialVisibility.PUBLIC,
        createdById: systemUser.id,
      },
    }),
    prisma.material.create({
      data: {
        name: 'Leading and Following Basics',
        description:
          'Fundamental concepts of leading and following in partner dancing',
        videoUrls: [],
        imageUrls: [],
        visibility: MaterialVisibility.PUBLIC,
        createdById: systemUser.id,
      },
    }),
  ]);

  // Create a composite material - Basic Salsa Combo
  await prisma.material.create({
    data: {
      name: 'Basic Salsa Combo',
      description:
        'A simple salsa combination using basic step, cross body lead, and right turn',
      videoUrls: [],
      imageUrls: [],
      visibility: MaterialVisibility.PUBLIC,
      createdById: systemUser.id,
      danceTypeId: salsaDanceType?.id,
      childMaterials: {
        connect: [
          { id: publicMaterials[0].id }, // Basic Salsa Step
          { id: publicMaterials[1].id }, // Salsa Cross Body Lead
          { id: publicMaterials[2].id }, // Salsa Right Turn
        ],
      },
    },
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

  // Connect dance types to workspace A's configuration
  await prisma.workspaceConfig.update({
    where: { workspaceId: workspaceA.id },
    data: {
      danceTypes: {
        connect: danceTypes.map((dt) => ({ id: dt.id })),
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

  const totalWorkspaces = await prisma.workspace.count();
  const totalUsers = await prisma.user.count();
  const totalMaterials = await prisma.material.count();
  const totalDanceTypes = await prisma.danceType.count();

  console.info(
    `Seed finished with ${totalWorkspaces} workspaces, ${totalUsers} users, ${totalMaterials} materials, ${totalDanceTypes} dance types 🌱`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
