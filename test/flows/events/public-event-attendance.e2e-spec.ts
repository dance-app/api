import { ConsoleLogger, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  PrismaClient,
  EventVisibility,
  AttendanceAction,
  DanceRole,
} from '@prisma/client';
import request from 'supertest';

import {
  createWorkspaceWithNoOwnerTest,
  signInTest,
  signUpTest,
} from '../common-tests';
import { setupSequentialFlow } from '../run-flow';

import { AppModule } from '@/app.module';
import { CreateEventDto } from '@/event/dto';
import {
  EventWithAttendees,
  EventWithWorkspace,
} from '@/event/types/event.type';
import { MailService } from '@/mail/mail.service';
import { MockUserDto, TestDataFactory } from '@/test/helpers/mock-data';
import { PrismaTestingService } from '@/test/helpers/prisma-testing.service';
import { MockMailService } from '@/test/mock-services/mock-mail.service';
import { UserWithAccount } from '@/user/user.types';
import { WorkspaceWithMember } from '@/workspace/worspace.types';
type FlowContext = {
  teacher?: { user: UserWithAccount; password: string; email: string } | null;
  registeredUser?: {
    user: UserWithAccount;
    password: string;
    email: string;
  } | null;
  workspace?: WorkspaceWithMember | null;
  eventData?: Partial<CreateEventDto> | null;
  guestUserData?: {
    name: string;
    email: string;
  } | null;
};

describe('Flow: Public Event Open Registration', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let mailService: MockMailService;
  const prismaTesting = new PrismaTestingService();
  const testData: FlowContext = {};

  // Shared context
  const context = {} as {
    teacherJwt?: string;
    registeredUserJwt?: string;
    workspace?: WorkspaceWithMember;
    event?: EventWithAttendees;
    guestAttendeeId?: number;
    registeredAttendeeId?: number;
  };

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

    testData.teacher = await prismaTesting.createMockUser();
    testData.registeredUser = await prismaTesting.createMockUser();
    testData.workspace = (
      await prismaTesting.createWorkspace(testData.teacher.user.id, {
        members: [{ user: testData.teacher.user, roles: ['OWNER'] }],
      })
    ).workspace;
    testData.eventData = TestDataFactory.createEventData({
      capacityMax: 20,
      visibility: EventVisibility.PUBLIC,
    });

    testData.guestUserData = {
      email: 'guest@example.com',
      name: 'Guest Dancer',
    };
  });

  afterAll(async () => {
    await app.close();
  });

  const flowSteps = [
    {
      name: 'Setup: Create teacher account and workspace',
      test: async () => {
        // Create teacher account
        const teacherResult = await signInTest(
          app,
          testData.teacher.email,
          testData.teacher.password,
        );
        context.teacherJwt = teacherResult.accessToken;
      },
    },
    {
      name: 'Teacher creates a public salsa class event',
      test: async () => {
        const response = await request(app.getHttpServer())
          .post(`/workspaces/${testData.workspace.slug}/events`)
          .set('Authorization', `Bearer ${context.teacherJwt}`)
          .send(testData.eventData)
          .expect(201);

        context.event = response.body;

        // Verify event properties
        expect(response.body.name).toBe(testData.eventData.name);
        expect(response.body.status.visibility).toBe(EventVisibility.PUBLIC);
        expect(response.body.capacity.capacityMax).toBe(
          testData.eventData.capacityMax,
        );
        expect(response.body.capacity.attendeeCount).toBe(
          testData.eventData.capacityMin || 0,
        );
        expect(response.body.capacity.isAtCapacity).toBe(false);
      },
    },
    {
      name: 'Anonymous user views the event details without authentication',
      test: async () => {
        // No authentication header
        const response = await request(app.getHttpServer())
          .get(
            `/workspaces/${testData.workspace.slug}/events/${context.event.id}`,
          )
          .expect(200);

        // Verify public event is visible
        expect(response.body.id).toBe(context.event.id);
        expect(response.body.name).toBe(testData.eventData.name);
        expect(response.body.description).toBe(testData.eventData.description);
        expect(response.body.schedule.location).toBe(
          testData.eventData.location,
        );

        // Verify no permission info for anonymous users
        expect(response.body.permissions).toBeUndefined();
      },
    },
    {
      name: 'Anonymous user registers as a guest with email and name',
      test: async () => {
        // TODO: this should not be possible actualy
        const response = await request(app.getHttpServer())
          .post(
            `/workspaces/${testData.workspace.slug}/events/${context.event.id}/attend`,
          )
          .send({
            action: AttendanceAction.REGISTERED,
            guestEmail: testData.guestUserData.email,
            guestName: testData.guestUserData.name,
          })
          .expect(200);

        expect(response.body.message).toContain('Successfully registered');

        // Verify guest attendee in database
        const attendee = await prisma.attendee.findFirst({
          where: {
            eventId: context.event.id,
            guestEmail: testData.guestUserData.email,
          },
          include: {
            historyEntries: true,
          },
        });

        expect(attendee).toBeDefined();
        expect(attendee.guestName).toBe(testData.guestUserData.name);
        expect(attendee.userId).toBeNull();
        expect(attendee.historyEntries).toHaveLength(1);
        expect(attendee.historyEntries[0].action).toBe(
          AttendanceAction.REGISTERED,
        );

        context.guestAttendeeId = attendee.id;
      },
    },
    {
      name: 'Registered user signs up for the same event with dance role preference',
      test: async () => {
        // First create the registered user
        const userResult = await signUpTest(
          app,
          prisma,
          mailService,
          testData.registeredUser.email,
          testData.registeredUser.user.firstName,
          testData.registeredUser.user.lastName,
          testData.registeredUser.password,
        );
        context.registeredUserJwt = userResult.accessToken;

        // Register for event with role preference
        const response = await request(app.getHttpServer())
          .post(
            `/workspaces/${testData.workspace.slug}/events/${context.event.id}/attend`,
          )
          .set('Authorization', `Bearer ${context.registeredUserJwt}`)
          .send({
            action: AttendanceAction.REGISTERED,
            role: DanceRole.LEADER,
          })
          .expect(200);

        expect(response.body.message).toContain('Successfully registered');

        // Verify registered user attendee
        const attendee = await prisma.attendee.findFirst({
          where: {
            eventId: context.event.id,
            userId: userResult.user.id,
          },
          include: {
            historyEntries: true,
          },
        });

        expect(attendee).toBeDefined();
        expect(attendee.role).toBe(DanceRole.LEADER);
        expect(attendee.guestEmail).toBeNull();
        expect(attendee.historyEntries).toHaveLength(1);
        expect(attendee.historyEntries[0].action).toBe(
          AttendanceAction.REGISTERED,
        );

        context.registeredAttendeeId = attendee.id;
      },
    },
    {
      name: 'Verify attendance counts and capacity tracking',
      test: async () => {
        const response = await request(app.getHttpServer())
          .get(
            `/workspaces/${testData.workspace.slug}/events/${context.event.id}`,
          )
          .expect(200);

        // Should have 2 attendees now
        expect(response.body.capacity.attendeeCount).toBe(2);
        expect(response.body.capacity.confirmedAttendeeCount).toBe(2);
        expect(response.body.capacity.availableSpots).toBe(18); // 20 - 2
        expect(response.body.capacity.isAtCapacity).toBe(false);
      },
    },
    {
      name: 'Guest cancels their attendance',
      test: async () => {
        // Guest cancels without authentication
        await request(app.getHttpServer())
          .post(
            `/workspaces/${testData.workspace.slug}/events/${context.event.id}/attend`,
          )
          .send({
            action: AttendanceAction.CANCELLED,
            guestEmail: testData.guestUserData.email,
          })
          .expect(200);

        // Verify cancellation in history
        const attendee = await prisma.attendee.findUnique({
          where: { id: context.guestAttendeeId },
          include: {
            historyEntries: {
              orderBy: { createdAt: 'desc' },
            },
          },
        });

        expect(attendee.historyEntries).toHaveLength(2);
        expect(attendee.historyEntries[0].action).toBe(
          AttendanceAction.CANCELLED,
        );
      },
    },
    {
      name: 'Verify updated attendance counts after cancellation',
      test: async () => {
        const response = await request(app.getHttpServer())
          .get(
            `/workspaces/${testData.workspace.slug}/events/${context.event.id}`,
          )
          .expect(200);

        // Should have 1 active attendee now
        expect(response.body.capacity.attendeeCount).toBe(1);
        expect(response.body.capacity.confirmedAttendeeCount).toBe(1);
        expect(response.body.capacity.availableSpots).toBe(19); // 20 - 1
      },
    },
  ];

  setupSequentialFlow(flowSteps);
});
