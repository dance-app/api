import {
  AccountProvider,
  PrismaClient,
  User,
  WorkspaceRole,
} from '@prisma/client';
import * as argon2 from 'argon2';

import { generateId, ID_PREFIXES } from '../src/lib/id-generator';

import { DanceLevel } from '@/member/enums/dance-level.enum';

export class PrismaTestingService {
  client: PrismaClient;
  private readonly shouldDisconnect: boolean;

  constructor(client?: PrismaClient) {
    this.client = client ?? new PrismaClient();
    this.shouldDisconnect = !client;
  }

  async reset() {
    return await this.client.$transaction([
      this.client.materialStudentShare.deleteMany(),
      this.client.notification.deleteMany(),
      this.client.attendee.deleteMany(),
      this.client.material.deleteMany(),
      this.client.invitation.deleteMany(),
      this.client.event.deleteMany(),
      this.client.member.deleteMany(),
      this.client.workspaceConfig.deleteMany(),
      this.client.workspace.deleteMany(),
      this.client.emailConfirmationToken.deleteMany(),
      this.client.passwordResetToken.deleteMany(),
      this.client.account.deleteMany(),
      this.client.notificationPreferences.deleteMany(),
      this.client.danceType.deleteMany(),
      this.client.user.deleteMany(),
    ]);
  }

  async close() {
    await this.reset();
    if (this.shouldDisconnect) {
      await this.client.$disconnect();
    }
  }

  async createWorkspace(
    name: string,
    slug: string,
    createdByUserId: string,
    linkUsers: User[],
    userRoles: WorkspaceRole[],
  ) {
    const members = linkUsers.map((u, i) => {
      return {
        id: generateId(ID_PREFIXES.MEMBER),
        createdById: createdByUserId,
        userId: u.id,
        name: u.firstName,
        roles: {
          set: [userRoles[i]],
        },
      };
    });
    return await this.client.workspace.create({
      data: {
        id: generateId(ID_PREFIXES.WORKSPACE),
        name,
        slug,
        createdById: createdByUserId,
        configuration: {
          create: {
            id: generateId(ID_PREFIXES.WORKSPACE_CONFIG),
            weekStart: 'MONDAY',
          },
        },
        members: {
          createMany: { data: members },
        },
      },
      include: {
        members: true,
        configuration: true,
      },
    });
  }

  async createMemberSeat(
    createdById: string,
    workspaceId: string,
    roles: WorkspaceRole[],
    name: string | undefined = undefined,
    level: DanceLevel | undefined = undefined,
  ) {
    return await this.client.member.create({
      data: {
        id: generateId(ID_PREFIXES.MEMBER),
        createdBy: {
          connect: {
            id: createdById,
          },
        },
        name,
        level,
        roles,
        workspace: {
          connect: {
            id: workspaceId,
          },
        },
      },
    });
  }

  async createUser(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    verifyEmail: boolean = true,
    superAdmin: boolean = false,
  ) {
    const hashedPass = await argon2.hash(password);
    const user = await this.client.user.create({
      data: {
        id: generateId(ID_PREFIXES.USER),
        firstName,
        lastName,
        isSuperAdmin: superAdmin,
        accounts: {
          create: {
            id: generateId(ID_PREFIXES.ACCOUNT),
            provider: AccountProvider.LOCAL,
            email,
            password: hashedPass,
            isEmailVerified: verifyEmail,
          },
        },
      },
      include: {
        accounts: true,
      },
    });
    return user;
  }

  async createSuperAdmin(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
  ) {
    return await this.createUser(email, password, firstName, lastName);
  }

  async getEmailVerificationToken(email: string) {
    const account = await this.client.account.findFirst({
      where: { email },
      include: { emailToken: true },
    });
    return account.emailToken.token;
  }

  async verifyEmail(email: string) {
    await this.client.account.updateMany({
      where: { email },
      data: { isEmailVerified: true },
    });
  }

  async expireEmailVerificationToken(email: string) {
    await this.client.emailConfirmationToken.updateMany({
      where: { account: { email } },
      data: { expiresAt: new Date() },
    });
  }
  async expireResetToken(email: string) {
    await this.client.passwordResetToken.updateMany({
      where: { account: { email } },
      data: { expiresAt: new Date() },
    });
  }

  async getResetToken(email: string) {
    const account = await this.client.account.findFirst({
      where: { email },
      include: { resetToken: true },
    });
    return account.resetToken.token;
  }
}
