import { INestApplication } from '@nestjs/common';
import { EventVisibility, PrismaClient, WorkspaceRole } from '@prisma/client';
import request from 'supertest';

import {
  signUpTest,
  createWorkspaceTest,
  createMemberSeatTest,
  sendInvitationTest,
  acceptInvitationTest,
} from '../helpers/common-tests';
import { setupSequentialFlow } from '../helpers/flow-runner';
import { TestDataBuilder } from '../helpers/test-data-builder';

import { MailService } from '@/mail/mail.service';
import { MockUserDto, TestDataFactory } from '@/test/helpers/mock-data';
import { PrismaTestingService } from '@/test/helpers/prisma-testing.service';
import { MockMailService } from '@/test/mock-services/mock-mail.service';
import { UserWithAccount } from '@/user/user.types';
import { WorkspaceWithMember } from '@/workspace/worspace.types';

describe('Flow: Recurring Event Series Management', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let mailService: MockMailService;

  // Test data
  const testData = {
    teacher: TestDataBuilder.createUser({
      email: 'teacher@dancestudio.com',
      firstName: 'Dance',
      lastName: 'Teacher',
    }),
    studentA: TestDataBuilder.createUser({
      email: 'student.a@example.com',
      firstName: 'Alice',
      lastName: 'Student',
    }),
    studentB: TestDataBuilder.createUser({
      email: 'student.b@example.com',
      firstName: 'Bob',
      lastName: 'Student',
    }),
    workspace: TestDataBuilder.createWorkspace({
      name: 'Salsa Dance Studio',
      slug: 'salsa-studio',
    }),
    recurringEvent: {
      name: 'Weekly Salsa Class - Beginners',
      description:
        'Learn the basics of salsa dancing in a fun, supportive environment',
      dateStart: new Date('2025-07-01T19:00:00Z'), // Start on a Monday
      dateEnd: new Date('2025-07-01T20:30:00Z'),
      location: 'Main Dance Hall, Studio A',
      capacityMin: 4,
      capacityMax: 20,
      visibility: EventVisibility.WORKSPACE_ONLY,
      rrule: 'FREQ=WEEKLY;BYDAY=MO;COUNT=10', // Weekly on Mondays, 10 occurrences
    },
  };

  // Shared context
  const context = {} as {
    // Users and auth
    teacher?: any;
    teacherJwt?: string;
    studentA?: any;
    studentAJwt?: string;
    studentB?: any;
    studentBJwt?: string;

    // Workspace
    workspace?: any;

    // Events
    parentEvent?: any;
    childEvents?: any[];
    specificOccurrence?: any; // The 5th occurrence for individual testing

    // Member seats
    studentASeat?: any;
    studentBSeat?: any;

    // Attendance
    studentASeriesAttendance?: any[];
    studentBSingleAttendance?: any;
  };

  beforeAll(async () => {
    app = await setupTestApp();
    prisma = app.get(DatabaseService);
    mailService = app.get(MailService);
  });

  afterAll(async () => {
    await app.close();
  });

  const flowSteps = [
    {
      name: 'Setup: Create teacher account and workspace',
      test: async () => {
        // Create teacher account
        const teacherSignup = await signUpTest(
          app,
          prisma,
          mailService,
          testData.teacher.email,
          testData.teacher.firstName,
          testData.teacher.lastName,
          testData.teacher.password,
        );
        context.teacher = teacherSignup.user;
        context.teacherJwt = teacherSignup.accessToken;

        // Create workspace
        context.workspace = await createWorkspaceTest(
          app,
          prisma,
          context.teacherJwt,
          testData.workspace.name,
          testData.workspace.slug,
        );

        expect(context.workspace.members).toHaveLength(1);
        expect(context.workspace.members[0].roles).toContain(
          WorkspaceRole.OWNER,
        );
      },
    },

    {
      name: 'Teacher creates weekly dance class series (10 occurrences)',
      test: async () => {
        const response = await request(app.getHttpServer())
          .post(`/workspace/${testData.workspace.slug}/events`)
          .set('Authorization', `Bearer ${context.teacherJwt}`)
          .send(testData.recurringEvent)
          .expect(201);

        context.parentEvent = response.body;

        // Verify parent event properties
        expect(context.parentEvent.name).toBe(testData.recurringEvent.name);
        expect(context.parentEvent.recurrence.rrule).toBe(
          testData.recurringEvent.rrule,
        );
        expect(context.parentEvent.recurrence.isRecurring).toBe(true);
        expect(context.parentEvent.recurrence.isParentEvent).toBe(true);

        // Verify child events were created
        const childEvents = await prisma.event.findMany({
          where: { parentEventId: context.parentEvent.id },
          orderBy: { dateStart: 'asc' },
        });

        expect(childEvents).toHaveLength(9); // 9 children + 1 parent = 10 total
        context.childEvents = childEvents;

        // Verify dates are correct (every Monday)
        const firstChild = childEvents[0];
        const firstChildDate = new Date(firstChild.dateStart);
        expect(firstChildDate.getDay()).toBe(1); // Monday

        // Store the 5th occurrence for later testing
        context.specificOccurrence = childEvents[4];
      },
    },

    {
      name: 'Setup: Create student accounts and add them to workspace',
      test: async () => {
        // Create Student A
        const studentASignup = await signUpTest(
          app,
          prisma,
          mailService,
          testData.studentA.email,
          testData.studentA.firstName,
          testData.studentA.lastName,
          testData.studentA.password,
        );
        context.studentA = studentASignup.user;
        context.studentAJwt = studentASignup.accessToken;

        // Create Student B
        const studentBSignup = await signUpTest(
          app,
          prisma,
          mailService,
          testData.studentB.email,
          testData.studentB.firstName,
          testData.studentB.lastName,
          testData.studentB.password,
        );
        context.studentB = studentBSignup.user;
        context.studentBJwt = studentBSignup.accessToken;

        // Add students to workspace
        context.studentASeat = await createMemberSeatTest(
          app,
          prisma,
          context.teacherJwt,
          testData.workspace.slug,
          WorkspaceRole.STUDENT,
        );

        context.studentBSeat = await createMemberSeatTest(
          app,
          prisma,
          context.teacherJwt,
          testData.workspace.slug,
          WorkspaceRole.STUDENT,
        );

        // Send invitations
        const inviteA = await sendInvitationTest(
          app,
          prisma,
          mailService,
          context.teacherJwt,
          testData.workspace.slug,
          context.studentASeat.id,
          testData.studentA.email,
        );

        const inviteB = await sendInvitationTest(
          app,
          prisma,
          mailService,
          context.teacherJwt,
          testData.workspace.slug,
          context.studentBSeat.id,
          testData.studentB.email,
        );

        // Accept invitations
        await acceptInvitationTest(
          app,
          prisma,
          context.studentAJwt,
          inviteA.invite.token,
          testData.workspace.slug,
          context.studentASeat.id,
        );

        await acceptInvitationTest(
          app,
          prisma,
          context.studentBJwt,
          inviteB.invite.token,
          testData.workspace.slug,
          context.studentBSeat.id,
        );
      },
    },

    {
      name: 'Student A registers for entire series',
      test: async () => {
        const response = await request(app.getHttpServer())
          .post(
            `/workspace/${testData.workspace.slug}/events/${context.parentEvent.id}/attend`,
          )
          .set('Authorization', `Bearer ${context.studentAJwt}`)
          .send({
            action: 'REGISTERED',
            role: 'FOLLOWER',
          })
          .expect(200);

        expect(response.body.message).toContain('Successfully registered');

        // Verify attendance was created for all events in series
        const attendances = await prisma.attendee.findMany({
          where: {
            userId: context.studentA.id,
            event: {
              OR: [
                { id: context.parentEvent.id },
                { parentEventId: context.parentEvent.id },
              ],
            },
          },
          include: {
            historyEntries: true,
          },
        });

        expect(attendances).toHaveLength(10); // Parent + 9 children
        context.studentASeriesAttendance = attendances;

        // Verify all have REGISTERED status
        attendances.forEach((attendance) => {
          expect(attendance.historyEntries).toHaveLength(1);
          expect(attendance.historyEntries[0].action).toBe('REGISTERED');
        });
      },
    },

    {
      name: 'Student B registers for single occurrence only',
      test: async () => {
        const response = await request(app.getHttpServer())
          .post(
            `/workspace/${testData.workspace.slug}/events/${context.specificOccurrence.id}/attend`,
          )
          .set('Authorization', `Bearer ${context.studentBJwt}`)
          .send({
            action: 'REGISTERED',
            role: 'LEADER',
          })
          .expect(200);

        // Verify only one attendance was created
        const attendances = await prisma.attendee.findMany({
          where: {
            userId: context.studentB.id,
            event: {
              OR: [
                { id: context.parentEvent.id },
                { parentEventId: context.parentEvent.id },
              ],
            },
          },
        });

        expect(attendances).toHaveLength(1);
        expect(attendances[0].eventId).toBe(context.specificOccurrence.id);
        context.studentBSingleAttendance = attendances[0];
      },
    },

    {
      name: 'Teacher updates series details (location change)',
      test: async () => {
        const newLocation = 'Relocated to Studio B - Second Floor';

        const response = await request(app.getHttpServer())
          .patch(
            `/workspace/${testData.workspace.slug}/events/${context.parentEvent.id}`,
          )
          .set('Authorization', `Bearer ${context.teacherJwt}`)
          .send({
            location: newLocation,
          })
          .expect(200);

        expect(response.body.schedule.location).toBe(newLocation);

        // Verify all child events were updated
        const updatedChildren = await prisma.event.findMany({
          where: { parentEventId: context.parentEvent.id },
        });

        updatedChildren.forEach((child) => {
          expect(child.location).toBe(newLocation);
        });
      },
    },

    {
      name: 'Teacher cancels one specific occurrence',
      test: async () => {
        const occurrenceToCancel = context.childEvents[2]; // Cancel the 3rd occurrence

        const response = await request(app.getHttpServer())
          .post(
            `/workspace/${testData.workspace.slug}/events/${occurrenceToCancel.id}/cancel`,
          )
          .set('Authorization', `Bearer ${context.teacherJwt}`)
          .send({
            reason: 'Instructor unavailable due to workshop attendance',
          })
          .expect(200);

        expect(response.body.status.isCancelled).toBe(true);
        expect(response.body.status.cancellationReason).toContain(
          'workshop attendance',
        );

        // Verify only this specific occurrence is cancelled
        const allEvents = await prisma.event.findMany({
          where: {
            OR: [
              { id: context.parentEvent.id },
              { parentEventId: context.parentEvent.id },
            ],
          },
        });

        const cancelledCount = allEvents.filter((e) => e.isCancelled).length;
        expect(cancelledCount).toBe(1);
      },
    },

    {
      name: 'Verify Student A (series registrant) sees all changes',
      test: async () => {
        // Get parent event to see series info
        const response = await request(app.getHttpServer())
          .get(
            `/workspace/${testData.workspace.slug}/events/${context.parentEvent.id}`,
          )
          .set('Authorization', `Bearer ${context.studentAJwt}`)
          .expect(200);

        expect(response.body.schedule.location).toBe(
          'Relocated to Studio B - Second Floor',
        );
        expect(response.body.permissions.isAttending).toBe(true);

        // Check specific cancelled occurrence
        const cancelledResponse = await request(app.getHttpServer())
          .get(
            `/workspace/${testData.workspace.slug}/events/${context.childEvents[2].id}`,
          )
          .set('Authorization', `Bearer ${context.studentAJwt}`)
          .expect(200);

        expect(cancelledResponse.body.status.isCancelled).toBe(true);
        expect(cancelledResponse.body.permissions.isAttending).toBe(true); // Still registered despite cancellation
      },
    },

    {
      name: 'Student A cancels attendance for remaining series',
      test: async () => {
        const response = await request(app.getHttpServer())
          .post(
            `/workspace/${testData.workspace.slug}/events/${context.parentEvent.id}/attend`,
          )
          .set('Authorization', `Bearer ${context.studentAJwt}`)
          .send({
            action: 'CANCELLED',
          })
          .expect(200);

        // Verify all attendances now have CANCELLED status
        const attendances = await prisma.attendee.findMany({
          where: {
            userId: context.studentA.id,
            event: {
              OR: [
                { id: context.parentEvent.id },
                { parentEventId: context.parentEvent.id },
              ],
            },
          },
          include: {
            historyEntries: {
              orderBy: { createdAt: 'desc' },
            },
          },
        });

        attendances.forEach((attendance) => {
          expect(attendance.historyEntries[0].action).toBe('CANCELLED');
          expect(attendance.historyEntries).toHaveLength(2); // REGISTERED then CANCELLED
        });
      },
    },

    {
      name: 'Verify Student B attendance remains unaffected',
      test: async () => {
        // Check that Student B is still registered for their single occurrence
        const attendance = await prisma.attendee.findFirst({
          where: {
            userId: context.studentB.id,
            eventId: context.specificOccurrence.id,
          },
          include: {
            historyEntries: true,
          },
        });

        expect(attendance).toBeDefined();
        expect(attendance.historyEntries).toHaveLength(1);
        expect(attendance.historyEntries[0].action).toBe('REGISTERED');

        // Verify through API
        const response = await request(app.getHttpServer())
          .get(
            `/workspace/${testData.workspace.slug}/events/${context.specificOccurrence.id}`,
          )
          .set('Authorization', `Bearer ${context.studentBJwt}`)
          .expect(200);

        expect(response.body.permissions.isAttending).toBe(true);
        expect(response.body.permissions.userAttendanceStatus).toBe(
          'REGISTERED',
        );
      },
    },

    {
      name: 'Verify event capacity tracking across series',
      test: async () => {
        // Check capacity for a non-cancelled event
        const response = await request(app.getHttpServer())
          .get(
            `/workspace/${testData.workspace.slug}/events/${context.childEvents[0].id}`,
          )
          .set('Authorization', `Bearer ${context.teacherJwt}`)
          .expect(200);

        // After Student A cancelled, only Student B should be attending specific occurrence
        if (context.childEvents[0].id === context.specificOccurrence.id) {
          expect(response.body.capacity.confirmedAttendeeCount).toBe(1);
        } else {
          expect(response.body.capacity.confirmedAttendeeCount).toBe(0);
        }

        expect(response.body.capacity.availableSpots).toBe(
          response.body.capacity.capacityMax -
            response.body.capacity.confirmedAttendeeCount,
        );
      },
    },
  ];

  setupSequentialFlow(flowSteps, 'Recurring Event Series Management');

  describe('Edge cases', () => {
    it('should prevent registration for cancelled occurrences', async () => {
      // This would need the context from the main flow, so it's better tested within the flow
      // or as a separate mini-flow
    });

    it('should handle updating series when some occurrences have already passed', async () => {
      // Test updating a series where some events are in the past
    });
  });
});
