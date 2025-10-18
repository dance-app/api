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
  NotificationType,
} from '@prisma/client';
import request from 'supertest';

import {
  createWorkspaceWithNoOwnerTest,
  signInTest,
  verifyEmailTest,
  createWorkspaceSeatTest,
  sendWorkspaceInviteTest,
  signUpTest,
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
  student?: UserWithAccount | null;
  studentJwt?: string | null;
  studentMemberSeat?: Member | null;
  workspaceInvite?: Invitation | null;
  workspace?: WorkspaceWithMember | null;
  confirmEmailToken?: string | null;
};

describe.skip('Teacher invites registered user to workspace', () => {
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

    // Create and verify student user BEFORE the test steps
    const studentResult = await signUpTest(
      app,
      prismaTesting.client,
      mailService,
      mockData.student.email,
      mockData.student.firstName,
      mockData.student.lastName,
      mockData.student.password,
    );
    testState.student = studentResult.user;
    testState.studentJwt = studentResult.accessToken;
    testState.confirmEmailToken = studentResult.confirmToken;

    // Verify student email
    await verifyEmailTest(app, testState.confirmEmailToken);
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
      name: 'Teacher invites registered student using email',
      test: async () => {
        const result = await sendWorkspaceInviteTest(
          app,
          prismaTesting.client,
          mailService,
          testState.teacherJwt!,
          testState.workspace!.slug,
          testState.studentMemberSeat!.id,
          mockData.student.email,
          testState.student!.id, // inviteeId is provided because student is already registered
        );
        testState.workspaceInvite = result.invite;
      },
    },
    {
      name: 'Student receives a notification about the invitation',
      test: async () => {
        // Check that a notification was created for the student
        const notifications = await prismaTesting.client.notification.findMany({
          where: {
            userId: testState.student!.id,
            type: NotificationType.INVITATION_RECEIVED,
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

        expect(notifications.length).toBeGreaterThan(0);
        const latestNotification = notifications[0];

        expect(latestNotification.type).toBe(
          NotificationType.INVITATION_RECEIVED,
        );
        expect(latestNotification.read).toBe(false);
        // expect(latestNotification.metadata).toEqual(
        //   expect.objectContaining({
        //     invitationId: testState.workspaceInvite!.id,
        //     workspaceName: testState.workspace!.name,
        //     workspaceSlug: testState.workspace!.slug,
        //     inviterName: expect.any(String),
        //   }),
        // );
      },
    },
    {
      name: 'Student can get their notifications via API',
      test: async () => {
        const response = await request(app.getHttpServer())
          .get('/notifications')
          .set('Authorization', `Bearer ${testState.studentJwt}`)
          .expect(200);

        expect(response.body.data.length).toBeGreaterThan(0);

        const invitationNotification = response.body.data.find(
          (notification: any) =>
            notification.type === NotificationType.INVITATION_RECEIVED,
        );

        expect(invitationNotification).toBeTruthy();
        expect(invitationNotification.read).toBe(false);
        expect(invitationNotification.metadata).toEqual(
          expect.objectContaining({
            invitationId: testState.workspaceInvite!.id,
            workspaceName: testState.workspace!.name,
          }),
        );
      },
    },
    {
      name: 'Student lists their invitations',
      test: async () => {
        await listPersonalInvitesTest(
          app,
          testState.studentJwt!,
          testState.workspace!,
          [
            {
              email: mockData.student.email,
              inviterId: testState.teacher!.id,
              inviteeId: testState.student!.id, // Linked to existing student user
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
      name: 'Student can see workspace in their workspaces list',
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
    {
      name: 'Student can see their member profile in the workspace',
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
      name: 'Student receives notification about workspace membership',
      test: async () => {
        // Check that a notification was created when student joined the workspace
        const notifications = await prismaTesting.client.notification.findMany({
          where: {
            userId: testState.student!.id,
            type: NotificationType.WORKSPACE_MEMBER_JOINED,
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

        expect(notifications.length).toBeGreaterThan(0);
        const latestNotification = notifications[0];

        expect(latestNotification.type).toBe(
          NotificationType.WORKSPACE_MEMBER_JOINED,
        );
        // expect(latestNotification.metadata).toEqual(
        //   expect.objectContaining({
        //     workspaceName: testState.workspace!.name,
        //     workspaceSlug: testState.workspace!.slug,
        //     memberRole: WorkspaceRole.STUDENT,
        //   }),
        // );
      },
    },
    {
      name: 'Teacher can see that invitation was accepted',
      test: async () => {
        // Teacher checks workspace invitations and sees the accepted status
        const response = await request(app.getHttpServer())
          .get(`/invitations/workspace/${testState.workspace!.slug}`)
          .set('Authorization', `Bearer ${testState.teacherJwt}`)
          .expect(200);

        expect(response.body).toHaveLength(1);
        expect(response.body[0]).toEqual(
          expect.objectContaining({
            email: mockData.student.email,
            status: InvitationStatus.ACCEPTED,
            token: testState.workspaceInvite!.token,
            inviterId: testState.teacher!.id,
            inviteeId: testState.student!.id,
            memberSeatId: testState.studentMemberSeat!.id,
          }),
        );
      },
    },
  ];

  setupTestSteps(testSteps);
});
