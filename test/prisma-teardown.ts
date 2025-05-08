import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
config({ path: '.env.test' });

const prisma = new PrismaClient();

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
