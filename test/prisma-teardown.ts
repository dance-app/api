import { config } from 'dotenv';
import { createPrismaClient } from '../src/lib/prisma-client';
config({ path: '.env.test' });

const prisma = createPrismaClient();

module.exports = async () => {
  // Delete in dependency order
  await prisma.$transaction([
    prisma.attendee.deleteMany(),
    prisma.event.deleteMany(),
    prisma.member.deleteMany(),
    prisma.workspaceConfig.deleteMany(),
    prisma.workspace.deleteMany(),
    prisma.account.deleteMany(),
    prisma.user.deleteMany(),
  ]);
  await prisma.$disconnect();
};
