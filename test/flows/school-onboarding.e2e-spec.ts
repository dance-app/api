// 1. Signing with superuser
// 2. Super user creates a workspace
// 3. Super user creates an owner empty seat
// 4. Super user invites a suer to become owner of the workspace (fill the empty seat)
// 5. User signups
// 6. user lists his invitations
// 7. User accepts invitation to become owner of the workspace
// 8. User retrieves the list of his workspace
// 9. User retrieves the details of his workspace
// 10. User updates the metadata of his workspace

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  Member,
  WorkspaceRole,
  Invitation,
  InvitationStatus,
} from '@prisma/client';

import {
  createWorkspaceWithNoOwnerTest,
  signInTest,
  createWorkspaceSeatTest,
  sendWorkspaceInviteTest,
  signUpTest,
  listWorkspaceInvitesTest,
  listPersonalInvitesTest,
  acceptInvitationTest,
  updateWorkspaceTest,
  getWorkspaceDetailsTest,
  getUserWorkspacesTest,
} from './common-tests';
import { setupTestSteps } from './run-flow';
import { AppModule } from '../../src/app.module';
import { MockMailService } from '../mock-mail.service';
import { PrismaTestingService } from '../prisma-testing.service';

import { MailService } from '@/mail/mail.service';
import { UserWithAccount } from '@/user/user.types';
import { WorkspaceWithMember } from '@/workspace/worspace.types';

const mockData = {
  superAdmin: {
    email: 'admin@example.com',
    password: 'password123',
    firstName: 'Super',
    lastName: 'Admin',
  },
  workspace: {
    name: 'First Workspace',
    slug: 'firstworkspace',
  },
  user: {
    email: 'user@example.com',
    password: 'password123',
    firstName: 'User',
    lastName: 'Name',
  },
  wrongPassword: 'wrongPassword',
  newPassword: 'newPassword123',
};
type FlowContext = {
  superAdmin?: UserWithAccount | null;
  resetToken?: string | null;
  superAdminJwt?: string | null;
  userJwt?: string | null;
  confirmEmailToken?: string | null;
  owner?: Member | null;
  workspaceInvite?: Invitation | null;
  workspace?: WorkspaceWithMember | null;
  user?: UserWithAccount | null;
};

describe.skip('Onboarding a new school owner', () => {
  let app: INestApplication;
  const prismaTesting = new PrismaTestingService();
  let mailService: MockMailService;

  const testState: FlowContext = {};

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(MailService)
      .useClass(MockMailService)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    mailService = moduleFixture.get<MockMailService>(MailService);

    await prismaTesting.reset();

    testState.superAdmin = await prismaTesting.createSuperAdmin(
      mockData.superAdmin.email,
      mockData.superAdmin.password,
      mockData.superAdmin.firstName,
      mockData.superAdmin.lastName,
    );
  });

  afterAll(async () => {
    await app.close();
  });

  const testSteps = [
    {
      name: 'Signing with superuser',
      test: async () => {
        const superAdminTokens = await signInTest(
          app,
          mockData.superAdmin.email,
          mockData.superAdmin.password,
        );
        testState.superAdminJwt = superAdminTokens.accessToken;
      },
    },
    {
      name: 'Super user creates a workspace',
      test: async () => {
        console.error(testState.superAdminJwt);
        const workspace = (
          await createWorkspaceWithNoOwnerTest(
            app,
            prismaTesting.client,
            testState.superAdminJwt,
            mockData.workspace.name,
            mockData.workspace.slug,
          )
        ).workspace;
        testState.workspace = workspace;
      },
    },
    {
      name: 'Super user creates an empty member seat for the owner in the workspace',
      test: async () => {
        const result = await createWorkspaceSeatTest(
          app,
          prismaTesting.client,
          testState.superAdminJwt,
          mockData.workspace.slug,
          WorkspaceRole.OWNER,
        );
        testState.owner = result.member;
      },
    },
    {
      name: 'Super user invites a suer to become owner of the workspace',
      test: async () => {
        const result = await sendWorkspaceInviteTest(
          app,
          prismaTesting.client,
          mailService,
          testState.superAdminJwt!,
          testState.workspace.slug,
          testState.owner.id,
          mockData.user.email,
        );
        testState.workspaceInvite = result.invite;
      },
    },
    {
      name: 'Super user sees the pending invitation',
      test: async () => {
        await listWorkspaceInvitesTest(
          app,
          testState.superAdminJwt!,
          testState.workspace,
          [
            {
              email: mockData.user.email,
              inviterId: testState.superAdmin.id,
              inviteeId: null,
              status: InvitationStatus.PENDING,
              token: testState.workspaceInvite.token,
              memberSeatId: testState.owner.id,
            },
          ],
        );
      },
    },
    {
      name: 'User signs up',
      test: async () => {
        const result = await signUpTest(
          app,
          prismaTesting.client,
          mailService,
          mockData.user.email,
          mockData.user.firstName,
          mockData.user.lastName,
          mockData.user.password,
        );
        testState.user = result.user;
        testState.userJwt = result.accessToken;
      },
    },
    {
      name: 'User lists his invitations',
      test: async () => {
        await listPersonalInvitesTest(
          app,
          testState.userJwt!,
          testState.workspace,
          [
            {
              email: mockData.user.email,
              inviterId: testState.superAdmin.id,
              inviteeId: testState.user.id,
              status: InvitationStatus.PENDING,
              token: testState.workspaceInvite.token,
              memberSeatId: testState.owner.id,
            },
          ],
        );
      },
    },
    {
      name: 'User accepts invitation to become owner of the workspace',
      test: async () => {
        await acceptInvitationTest(
          app,
          prismaTesting.client,
          testState.userJwt!,
          testState.workspaceInvite.token,
          testState.workspace.slug,
          testState.owner.id,
        );
      },
    },
    {
      name: 'User retrieves the list of his workspaces',
      test: async () => {
        await getUserWorkspacesTest(app, testState.userJwt!, [
          {
            id: testState.workspace.id,
            name: testState.workspace.name,
            slug: testState.workspace.slug,
          },
        ]);
      },
    },
    {
      name: 'User retrieves the details of his workspace',
      test: async () => {
        await getWorkspaceDetailsTest(
          app,
          testState.userJwt!,
          testState.workspace.slug,
          {
            id: testState.workspace.id,
            name: testState.workspace.name,
            slug: testState.workspace.slug,
            createdAt: testState.workspace.createdAt,
            updatedAt: testState.workspace.updatedAt,
          },
        );
      },
    },
    {
      name: 'User updates the metadata of his workspace',
      test: async () => {
        const updatedName = 'Updated Workspace Name';
        await updateWorkspaceTest(
          app,
          prismaTesting.client,
          testState.userJwt!,
          testState.workspace.id,
          {
            name: updatedName,
            slug: testState.workspace.slug, // Keep same slug
          },
          {
            id: testState.workspace.id,
            name: updatedName,
            slug: testState.workspace.slug,
          },
        );
        // Update test state for consistency
        testState.workspace.name = updatedName;
      },
    },
  ];

  setupTestSteps(testSteps);
});
