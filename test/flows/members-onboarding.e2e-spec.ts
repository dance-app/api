// Teacher invite unregistered user to join his workspace:
// 1. Teacher invites students
// 2. Students signs up
// 3. Student verify his email
// 4. Students list invitations
// 5. Student accepts invitation to join workspace
// 6. Student see his member profile (level, role, ...)
// 7. Student lists events in workspace
// 8.

// Teacher creates anonymous member in his workspace:
// 1. Teacher creates 10 new members with only name
// 2. Teacher gets list of members

// Teacher invites registered user to join his workspace
// 1. Teacher invites student using email
// 2. Student receives a notification
// 3. Student list invitations
// 4. Student accept invitation
// 5. Student list his workspaces
// 6. Student see his member profile

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  Member,
  WorkspaceRole,
  Invitation,
  InvitationStatus,
} from '@prisma/client';
import request from 'supertest';

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
  teacher: {
    email: 'teacher@example.com',
    password: 'password123',
    firstName: 'John',
    lastName: 'Teacher',
  },
  workspace: {
    name: 'Dance Studio',
    slug: 'dance-studio',
  },
  student: {
    email: 'student@example.com',
    password: 'password123',
    firstName: 'Jane',
    lastName: 'Student',
  },
};

type FlowContext = {
  teacher?: UserWithAccount | null;
  teacherJwt?: string | null;
  studentJwt?: string | null;
  studentMemberSeat?: Member | null;
  workspaceInvite?: Invitation | null;
  workspace?: WorkspaceWithMember | null;
  student?: UserWithAccount | null;
  confirmEmailToken?: string | null;
};

describe('Teacher invites unregistered student to workspace', () => {
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

    // Create teacher user and workspace
    testState.teacher = await prismaTesting.createUser(
      mockData.teacher.email,
      mockData.teacher.password,
      mockData.teacher.firstName,
      mockData.teacher.lastName,
    );

    // Sign in teacher to get JWT
    const teacherTokens = await signInTest(
      app,
      mockData.teacher.email,
      mockData.teacher.password,
    );
    testState.teacherJwt = teacherTokens.accessToken;

    // Create workspace for teacher
    const workspace = (
      await createWorkspaceWithNoOwnerTest(
        app,
        prismaTesting.client,
        testState.teacherJwt,
        mockData.workspace.name,
        mockData.workspace.slug,
      )
    ).workspace;
    testState.workspace = workspace;
  });

  afterAll(async () => {
    await app.close();
  });

  const testSteps = [
    {
      name: 'Teacher creates a student member seat in the workspace',
      test: async () => {
        const result = await createWorkspaceSeatTest(
          app,
          prismaTesting.client,
          testState.teacherJwt!,
          mockData.workspace.slug,
          WorkspaceRole.STUDENT,
        );
        testState.studentMemberSeat = result.member;
      },
    },
    {
      name: 'Teacher invites unregistered student to join workspace',
      test: async () => {
        const result = await sendWorkspaceInviteTest(
          app,
          prismaTesting.client,
          mailService,
          testState.teacherJwt!,
          testState.workspace!.slug,
          testState.studentMemberSeat!.id,
          mockData.student.email,
          undefined, // inviteeId is undefined because student is not registered yet
        );
        testState.workspaceInvite = result.invite;
      },
    },
    {
      name: 'Teacher can see the pending invitation in workspace invitations',
      test: async () => {
        await listWorkspaceInvitesTest(
          app,
          testState.teacherJwt!,
          testState.workspace!,
          [
            {
              email: mockData.student.email,
              inviterId: testState.teacher!.id,
              inviteeId: null, // null because student hasn't signed up yet
              status: InvitationStatus.PENDING,
              token: testState.workspaceInvite!.token,
              memberSeatId: testState.studentMemberSeat!.id,
            },
          ],
        );
      },
    },
    {
      name: 'Student signs up with the invited email',
      test: async () => {
        const result = await signUpTest(
          app,
          prismaTesting.client,
          mailService,
          mockData.student.email,
          mockData.student.firstName,
          mockData.student.lastName,
          mockData.student.password,
        );
        testState.student = result.user;
        testState.studentJwt = result.accessToken;
        testState.confirmEmailToken = result.confirmToken;
      },
    },
    {
      name: 'Student verifies his email',
      test: async () => {
        await verifyEmailTest(app, testState.confirmEmailToken!);
      },
    },
    {
      name: 'Student lists his personal invitations',
      test: async () => {
        await listPersonalInvitesTest(
          app,
          testState.studentJwt!,
          testState.workspace!,
          [
            {
              email: mockData.student.email,
              inviterId: testState.teacher!.id,
              inviteeId: testState.student!.id, // Now linked to the student user
              status: InvitationStatus.PENDING,
              token: testState.workspaceInvite!.token,
              memberSeatId: testState.studentMemberSeat!.id,
            },
          ],
        );
      },
    },
    {
      name: 'Student accepts invitation to join workspace',
      test: async () => {
        await acceptInvitationTest(
          app,
          prismaTesting.client,
          testState.studentJwt!,
          testState.workspaceInvite!.token,
          testState.workspace!.slug,
          testState.studentMemberSeat!.id,
        );
      },
    },
    {
      name: 'Student can see his member profile in the workspace',
      test: async () => {
        // Get student's member profile
        const response = await request(app.getHttpServer())
          .get(
            `/workspace/${testState.workspace!.slug}/members/${testState.studentMemberSeat!.id}`,
          )
          .set('Authorization', `Bearer ${testState.studentJwt}`)
          .expect(200);

        // Verify member profile structure
        expect(response.body).toEqual(
          expect.objectContaining({
            id: testState.studentMemberSeat!.id,
            name: testState.studentMemberSeat!.name,
            roles: expect.arrayContaining([WorkspaceRole.STUDENT]),
            userId: testState.student!.id,
            workspaceId: testState.workspace!.id,
            level: testState.studentMemberSeat!.level,
            preferedDanceRole: testState.studentMemberSeat!.preferedDanceRole,
          }),
        );

        // Verify that the member is properly linked to the user
        expect(response.body.userId).toBe(testState.student!.id);
        expect(response.body.roles).toContain(WorkspaceRole.STUDENT);
      },
    },
    {
      name: 'Student can see workspace in his workspaces list',
      test: async () => {
        await getUserWorkspacesTest(app, testState.studentJwt!, [
          {
            id: testState.workspace!.id,
            name: testState.workspace!.name,
            slug: testState.workspace!.slug,
          },
        ]);
      },
    },
  ];

  setupTestSteps(testSteps);
});
