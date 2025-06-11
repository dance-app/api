// Setup: Workspace with owner + 10 registered members + 10 unregistered members
// 1. Owner schedules new event
// 2. Owner sends invitation to 5 registered members
// 3. members list their invitations
// 4. Uninvited users get 403 when accessing the event
// 5. Invited member can see the details of the event
// 6. invited memeber get notification
// 7. invited member updates his attendance status
// 8. owner sees the attendance of the event be updated
// 9. owner ads 5 unregistered members

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

import { faker } from '@faker-js/faker';
import { ConsoleLogger, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  Member,
  WorkspaceRole,
  Invitation,
  InvitationStatus,
  EventVisibility,
  Event,
} from '@prisma/client';

import { AppModule } from '../../../src/app.module';
import { PrismaTestingService } from '../../helpers/prisma-testing.service';
import { MockMailService } from '../../mock-services/mock-mail.service';
import {
  createWorkspaceWithNoOwnerTest,
  signInTest,
  verifyEmailTest,
  createWorkspaceSeatTest,
  sendWorkspaceInviteTest,
  signUpTest,
  listWorkspaceInvitesTest,
  listPersonalInvitesTest,
  acceptInvitationTest,
  updateWorkspaceTest,
  getWorkspaceDetailsTest,
  getUserWorkspacesTest,
  sendEventInviteTest,
  createEvent,
  createAttendeeSeatTest,
} from '../common-tests';
import { FlowStep, setupSequentialFlow } from '../run-flow';

import { AttendeeWithUser } from '@/event/types/event.type';
import { MailService } from '@/mail/mail.service';
import { UserWithAccount } from '@/user/user.types';
import { WorkspaceWithMember } from '@/workspace/worspace.types';

const mockData = {
  event: {
    name: faker.book.title(),
    startDate: faker.date.future(),
    visibility: EventVisibility.INVITATION_ONLY,
  },
};
type FlowContext = {
  event?: Event | null;
  superAdmin?: UserWithAccount | null;
  resetToken?: string | null;
  superAdminJwt?: string | null;
  ownerJwt?: string | null;
  confirmEmailToken?: string | null;
  ownerUser?: UserWithAccount | null;
  ownerUserPassword?: string | null;
  owner?: Member | null;
  workspaceInvite?: Invitation | null;
  workspace?: WorkspaceWithMember | null;
  user?: UserWithAccount | null;
  attendeeSeat?: AttendeeWithUser | null;
};

describe('Creating an invitation-only single time event', () => {
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
      .setLogger(new ConsoleLogger())
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    mailService = moduleFixture.get<MockMailService>(MailService);

    await prismaTesting.reset();

    ({ user: testState.superAdmin } =
      await prismaTesting.createMockSuperAdmin());
    const mockOwnerUser = await prismaTesting.createMockUser();
    testState.ownerUser = mockOwnerUser.user;
    testState.ownerUserPassword = mockOwnerUser.password;
    const mockEntities = await prismaTesting.createMockWorkspace(
      testState.superAdmin.id,
      {
        members: [
          {
            user: testState.ownerUser,
            roles: [WorkspaceRole.OWNER],
          },
        ],
        createMockStudents: 10,
      },
    );
    testState.workspace = mockEntities.workspace;
  });

  afterAll(async () => {
    await app.close();
  });

  const testSteps: FlowStep[] = [
    {
      name: 'Owner signs in',
      test: async () => {
        const ownerTokens = await signInTest(
          app,
          testState.ownerUser.accounts[0].email,
          testState.ownerUserPassword!,
        );
        testState.ownerJwt = ownerTokens.accessToken;
      },
    },
    {
      name: 'Owner creates the event',
      test: async () => {
        testState.event = await createEvent(
          app,
          prismaTesting.client,
          testState.ownerJwt,
          testState.workspace.slug,
          mockData.event.name,
          mockData.event.startDate,
          mockData.event.visibility,
        );
      },
    },
    {
      name: 'Organizer creates attendee seats',
      test: async () => {
        const testRestult = await createAttendeeSeatTest(
          app,
          prismaTesting.client,
          testState.ownerJwt,
          testState.workspace.slug,
          testState.event.id,
          testState.workspace.members[0].userId,
        );
        testState.attendeeSeat = testRestult.attendee;
      },
    },
    {
      name: 'Organizer sends invitations',
      test: async () => {
        const testResult = await sendEventInviteTest(
          app,
          prismaTesting.client,
          mailService,
          testState.ownerJwt,
          testState.event.id,
          testState.attendeeSeat.id,
          undefined,
          testState.workspace.members[0].userId,
        );
        //testState.eventInvite = testResult.invite;
      },
    },
  ];

  setupSequentialFlow(testSteps);
});
