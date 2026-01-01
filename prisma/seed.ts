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
  InvitationStatus,
  InviteType,
} from '@prisma/client';
import * as argon2 from 'argon2';
import { randomUUID } from 'crypto';

import { MOCK_USER } from '@/lib/constants';
import { generateId, ID_PREFIXES } from '@/lib/id-generator';

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
      id: generateId(ID_PREFIXES.USER),
      firstName: opts.firstName,
      lastName: opts.lastName,
      isSuperAdmin: opts.isSuperAdmin ?? false,
      accounts: {
        create: {
          id: generateId(ID_PREFIXES.ACCOUNT),
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

// Helper to generate random members with different scenarios
async function generateDiverseMembers(
  workspaceId: string,
  createdById: string,
  count: number,
) {
  const members = [];
  const invitations = [];

  for (let i = 0; i < count; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const email = faker.internet.email({ firstName, lastName }).toLowerCase();

    // Determine member type and scenario
    const scenario = faker.number.int({ min: 1, max: 100 });

    // 30% - Registered user members (have userId, no invitation)
    if (scenario <= 30) {
      const user = await createUser({
        firstName,
        lastName,
        email,
        password: 'password123',
      });

      members.push({
        id: generateId(ID_PREFIXES.MEMBER),
        userId: user.id,
        name: null, // Name comes from user
        createdById,
        workspaceId,
        roles: [
          faker.helpers.arrayElement([
            WorkspaceRole.STUDENT,
            WorkspaceRole.TEACHER,
          ]),
        ],
        level: faker.helpers.maybe(
          () => faker.number.int({ min: 1, max: 10 }),
          { probability: 0.7 },
        ),
        preferredDanceRole: faker.helpers.maybe(
          () =>
            faker.helpers.arrayElement([DanceRole.LEADER, DanceRole.FOLLOWER]),
          { probability: 0.6 },
        ),
      });
    }
    // 20% - Anonymous members (no userId, no invitation)
    else if (scenario <= 50) {
      members.push({
        id: generateId(ID_PREFIXES.MEMBER),
        userId: null,
        name: `${firstName} ${lastName}`,
        createdById,
        workspaceId,
        roles: [WorkspaceRole.STUDENT],
        level: faker.helpers.maybe(
          () => faker.number.int({ min: 1, max: 10 }),
          { probability: 0.7 },
        ),
        preferredDanceRole: faker.helpers.maybe(
          () =>
            faker.helpers.arrayElement([DanceRole.LEADER, DanceRole.FOLLOWER]),
          { probability: 0.6 },
        ),
      });
    }
    // 25% - Members with accepted invitations (have userId and invitation)
    else if (scenario <= 75) {
      const user = await createUser({
        firstName,
        lastName,
        email,
        password: 'password123',
      });

      const memberId = generateId(ID_PREFIXES.MEMBER);

      members.push({
        id: memberId,
        userId: user.id,
        name: null,
        createdById,
        workspaceId,
        roles: [
          faker.helpers.arrayElement([
            WorkspaceRole.STUDENT,
            WorkspaceRole.TEACHER,
          ]),
        ],
        level: faker.helpers.maybe(
          () => faker.number.int({ min: 1, max: 10 }),
          { probability: 0.7 },
        ),
        preferredDanceRole: faker.helpers.maybe(
          () =>
            faker.helpers.arrayElement([DanceRole.LEADER, DanceRole.FOLLOWER]),
          { probability: 0.6 },
        ),
      });

      // Store invitation to create after member
      invitations.push({
        id: generateId(ID_PREFIXES.INVITATION),
        type: InviteType.WORKSPACE,
        email,
        firstName,
        lastName,
        token: randomUUID(),
        expiresAt: faker.date.future(),
        status: InvitationStatus.ACCEPTED,
        workspaceId,
        inviterId: createdById,
        inviteeId: user.id,
        memberSeatId: memberId,
      });
    }
    // 15% - Members with pending invitations (no userId yet, have invitation)
    else if (scenario <= 90) {
      const memberId = generateId(ID_PREFIXES.MEMBER);

      members.push({
        id: memberId,
        userId: null,
        name: `${firstName} ${lastName}`,
        createdById,
        workspaceId,
        roles: [WorkspaceRole.STUDENT],
        level: faker.helpers.maybe(
          () => faker.number.int({ min: 1, max: 10 }),
          { probability: 0.5 },
        ),
        preferredDanceRole: faker.helpers.maybe(
          () =>
            faker.helpers.arrayElement([DanceRole.LEADER, DanceRole.FOLLOWER]),
          { probability: 0.6 },
        ),
      });

      // Store invitation to create after member
      invitations.push({
        id: generateId(ID_PREFIXES.INVITATION),
        type: InviteType.WORKSPACE,
        email,
        firstName,
        lastName,
        token: randomUUID(),
        expiresAt: faker.date.future(),
        status: InvitationStatus.PENDING,
        workspaceId,
        inviterId: createdById,
        inviteeId: null,
        memberSeatId: memberId,
      });
    }
    // 10% - Members with declined invitations (no userId, invitation declined)
    else {
      const memberId = generateId(ID_PREFIXES.MEMBER);

      // Some declined invitations have registered users who declined
      const declinedByRegisteredUser = faker.datatype.boolean();
      let declinedUser = null;

      if (declinedByRegisteredUser) {
        declinedUser = await createUser({
          firstName,
          lastName,
          email,
          password: 'password123',
        });
      }

      members.push({
        id: memberId,
        userId: null,
        name: `${firstName} ${lastName}`,
        createdById,
        workspaceId,
        roles: [WorkspaceRole.STUDENT],
        level: null,
        preferredDanceRole: null,
      });

      // Store invitation to create after member
      invitations.push({
        id: generateId(ID_PREFIXES.INVITATION),
        type: InviteType.WORKSPACE,
        email,
        firstName,
        lastName,
        token: randomUUID(),
        expiresAt: faker.date.past(),
        status: InvitationStatus.DECLINED,
        workspaceId,
        inviterId: createdById,
        inviteeId: declinedUser?.id || null,
        memberSeatId: memberId,
      });
    }
  }

  return { members, invitations };
}

async function main() {
  // ------------------------------------------------------------------
  // Global users
  // ------------------------------------------------------------------
  const john = await createUser({
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
        id: generateId(ID_PREFIXES.MATERIAL),
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
        id: generateId(ID_PREFIXES.MATERIAL),
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
        id: generateId(ID_PREFIXES.MATERIAL),
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
        id: generateId(ID_PREFIXES.MATERIAL),
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
        id: generateId(ID_PREFIXES.MATERIAL),
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
        id: generateId(ID_PREFIXES.MATERIAL),
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
        id: generateId(ID_PREFIXES.MATERIAL),
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
        id: generateId(ID_PREFIXES.MATERIAL),
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
        id: generateId(ID_PREFIXES.MATERIAL),
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
        id: generateId(ID_PREFIXES.MATERIAL),
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
        id: generateId(ID_PREFIXES.MATERIAL),
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
        id: generateId(ID_PREFIXES.MATERIAL),
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
      id: generateId(ID_PREFIXES.MATERIAL),
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
      id: generateId(ID_PREFIXES.WORKSPACE),
      name: 'Studio A',
      slug: 'studio-a',
      createdById: ownerA.id,
      configuration: {
        create: {
          id: generateId(ID_PREFIXES.WORKSPACE_CONFIG),
          weekStart: WeekStart.MONDAY,
        },
      },
    },
  });

  // Add workspace owners
  await prisma.member.createMany({
    data: [
      {
        id: generateId(ID_PREFIXES.MEMBER),
        userId: ownerA.id,
        createdById: ownerA.id,
        workspaceId: workspaceA.id,
        roles: [WorkspaceRole.OWNER],
      },
      {
        id: generateId(ID_PREFIXES.MEMBER),
        userId: john.id,
        createdById: ownerA.id,
        workspaceId: workspaceA.id,
        roles: [WorkspaceRole.OWNER],
      },
    ],
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

  // Generate 100 diverse members for Studio A with various scenarios
  console.log('🌱 Generating 100 diverse members for Studio A...');
  const { members: diverseMembers, invitations: diverseInvitations } =
    await generateDiverseMembers(workspaceA.id, ownerA.id, 100);

  // Insert members in batches to avoid overwhelming the database
  const batchSize = 20;
  for (let i = 0; i < diverseMembers.length; i += batchSize) {
    const batch = diverseMembers.slice(i, i + batchSize);
    await prisma.member.createMany({ data: batch });
  }

  // Now create invitations after members exist
  console.log('🌱 Creating invitations for members...');
  for (let i = 0; i < diverseInvitations.length; i += batchSize) {
    const batch = diverseInvitations.slice(i, i + batchSize);
    await prisma.invitation.createMany({ data: batch });
  }

  // Get all actual members (those with userId) for event attendance
  const membersA = await prisma.member.findMany({
    where: {
      workspaceId: workspaceA.id,
      userId: { not: null },
      roles: { has: WorkspaceRole.STUDENT },
    },
    take: 30, // Limit to 30 for events
  });

  // Events in workspace A
  for (let i = 0; i < 2; i++) {
    const dateStart = faker.date.soon({ days: 7 });
    const event = await prisma.event.create({
      data: {
        id: generateId(ID_PREFIXES.EVENT),
        name: `Studio A – Class ${i + 1}`,
        description: faker.lorem.sentence(),
        dateStart,
        dateEnd: new Date(dateStart.getTime() + 60 * 60 * 1000),
        organizerId: workspaceA.id,
        rule: [],
      },
    });

    // Random subset of members attend
    const attendingMembers = faker.helpers.arrayElements(
      membersA,
      faker.number.int({ min: 5, max: Math.min(15, membersA.length) }),
    );

    await prisma.attendee.createMany({
      data: attendingMembers.map((m, idx) => ({
        id: generateId(ID_PREFIXES.ATTENDEE),
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
      id: generateId(ID_PREFIXES.WORKSPACE),
      name: 'Studio B',
      slug: 'studio-b',
      createdById: ownerB.id,
      configuration: {
        create: {
          id: generateId(ID_PREFIXES.WORKSPACE_CONFIG),
          weekStart: WeekStart.SUNDAY,
        },
      },
    },
  });

  // Add workspace B owners
  await prisma.member.createMany({
    data: [
      {
        id: generateId(ID_PREFIXES.MEMBER),
        userId: ownerB.id,
        createdById: ownerB.id,
        workspaceId: workspaceB.id,
        roles: [WorkspaceRole.OWNER],
      },
      {
        id: generateId(ID_PREFIXES.MEMBER),
        userId: john.id,
        createdById: ownerB.id,
        workspaceId: workspaceB.id,
        roles: [WorkspaceRole.OWNER],
      },
    ],
  });

  // 5 simple registered members in workspace B
  const usersB = await Promise.all(
    Array.from({ length: 5 }).map(() =>
      createUser({
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        email: faker.internet.email(),
      }),
    ),
  );
  await prisma.member.createMany({
    data: usersB.map((m) => ({
      id: generateId(ID_PREFIXES.MEMBER),
      userId: m.id,
      createdById: ownerB.id,
      workspaceId: workspaceB.id,
      roles: [WorkspaceRole.STUDENT],
    })),
  });

  const totalWorkspaces = await prisma.workspace.count();
  const totalUsers = await prisma.user.count();
  const totalMembers = await prisma.member.count();
  const totalMaterials = await prisma.material.count();
  const totalDanceTypes = await prisma.danceType.count();
  const totalInvitations = await prisma.invitation.count();
  const totalEvents = await prisma.event.count();

  console.info(`
🌱 Seed completed successfully!

Summary:
  - Workspaces: ${totalWorkspaces} (Studio A with 100 diverse members, Studio B with 5 members)
  - Users: ${totalUsers}
  - Members: ${totalMembers}
  - Invitations: ${totalInvitations} (accepted, pending, and declined)
  - Events: ${totalEvents}
  - Materials: ${totalMaterials} (public dance moves)
  - Dance Types: ${totalDanceTypes}

Test Accounts:
  - john.doe@email.com (Super Admin, Owner of both workspaces) - password: adminadmin
  - jane.doe@email.com (Regular User) - password: adminadmin
  - alice.admin@studio-a.com (Studio A Owner) - password: admin
  - bob.boss@studio-b.com (Studio B Owner) - password: admin

Studio A includes:
  - 30% Registered members (no invitation)
  - 20% Anonymous members (no user account)
  - 25% Members who accepted invitations
  - 15% Members with pending invitations
  - 10% Members with declined invitations
  `);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
