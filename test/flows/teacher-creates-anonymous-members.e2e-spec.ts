// Teacher creates anonymous member in his workspace:
// 1. Teacher creates 10 new members with only name
// 2. Teacher gets list of members

import {
  ClassSerializerInterceptor,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { DanceRole, Member, WorkspaceRole } from '@prisma/client';
import request from 'supertest';

import { createWorkspaceWithNoOwnerTest, signInTest } from './common-tests';
import { setupTestSteps } from './run-flow';
import { AppModule } from '../../src/app.module';
import { MockMailService } from '../mock-mail.service';
import { PrismaTestingService } from '../prisma-testing.service';

import { MailService } from '@/mail/mail.service';
import { DanceLevel } from '@/member/enums/dance-level.enum';
import { PrismaExceptionFilter } from '@/prisma-exception.filter';
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
  anonymousMembers: [
    {
      name: 'Alice Johnson',
      roles: [WorkspaceRole.STUDENT],
      preferedDancingRole: DanceRole.FOLLOWER,
      level: DanceLevel.BEGINNER,
    },
    {
      name: 'Bob Smith',
      roles: [WorkspaceRole.STUDENT],
      preferedDancingRole: DanceRole.FOLLOWER,
      level: DanceLevel.EXPERT,
    },
    {
      name: 'Carol Davis',
      roles: [WorkspaceRole.STUDENT],
      preferedDancingRole: DanceRole.LEADER,
      level: DanceLevel.INTERMEDIARY,
    },
    {
      name: 'David Wilson',
      roles: [WorkspaceRole.STUDENT],
      preferedDancingRole: DanceRole.LEADER,
      level: DanceLevel.CONFIRMED,
    },
    {
      name: 'Eva Brown',
      roles: [WorkspaceRole.STUDENT],
      preferedDancingRole: DanceRole.LEADER,
      level: DanceLevel.CONFIRMED,
    },
    {
      name: 'Frank Miller',
      roles: [WorkspaceRole.STUDENT],
      level: DanceLevel.BEGINNER,
    },
    {
      name: 'Grace Lee',
      roles: [WorkspaceRole.STUDENT],
      level: DanceLevel.CONFIRMED,
    },
    {
      name: 'Henry Clark',
      roles: [WorkspaceRole.STUDENT],
      level: DanceLevel.BEGINNER,
    },
    {
      name: 'Ivy Turner',
      roles: [WorkspaceRole.STUDENT],
      level: DanceLevel.STARTER,
    },
    {
      name: 'Jack White',
      roles: [WorkspaceRole.STUDENT],
      level: DanceLevel.STARTER,
    },
  ],
};

type FlowContext = {
  teacher?: UserWithAccount | null;
  teacherJwt?: string | null;
  workspace?: WorkspaceWithMember | null;
  createdMembers?: Member[];
};

describe.skip('Teacher creates anonymous members in workspace', () => {
  let app: INestApplication;
  const prismaTesting = new PrismaTestingService();

  const testState: FlowContext = {
    createdMembers: [],
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(MailService)
      .useClass(MockMailService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    app.useGlobalFilters(new PrismaExceptionFilter());
    app.useGlobalInterceptors(
      new ClassSerializerInterceptor(app.get(Reflector)),
    );
    await app.init();

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
    ...mockData.anonymousMembers.map((memberData, index) => ({
      name: `Teacher creates anonymous member ${index + 1}: ${memberData.name}`,
      test: async () => {
        const addMemberPayload = {
          memberName: memberData.name,
          roles: memberData.roles,
          preferedDanceRole: memberData.preferedDancingRole,
          level: memberData.level,
          // No email or userId - this creates an anonymous member
        };

        const response = await request(app.getHttpServer())
          .post(`/workspace/${testState.workspace!.slug}/members`)
          .set('Authorization', `Bearer ${testState.teacherJwt}`)
          .send(addMemberPayload)
          .expect(201);

        // Verify response structure
        expect(response.body).toEqual(
          expect.objectContaining({
            id: expect.any(Number),
            name: memberData.name,
            roles: expect.arrayContaining(memberData.roles),
            user: null, // Should be null for anonymous members
            workspaceId: testState.workspace!.id,
            level: memberData.level ?? null,
            preferedDanceRole: memberData.preferedDancingRole ?? null,
          }),
        );

        // Verify database record
        const dbMember = await prismaTesting.client.member.findUnique({
          where: { id: response.body.id },
          include: { user: true },
        });

        expect(dbMember).toBeTruthy();
        expect(dbMember!.name).toBe(memberData.name);
        expect(dbMember!.level).toBe(memberData.level ?? null);
        expect(dbMember!.preferedDanceRole).toBe(
          memberData.preferedDancingRole ?? null,
        );
        expect(dbMember!.roles).toEqual(
          expect.arrayContaining(memberData.roles),
        );
        expect(dbMember!.userId).toBeNull();
        expect(dbMember!.user).toBeNull();

        // Store created member for later verification
        testState.createdMembers!.push(response.body);
      },
    })),
    {
      name: 'Teacher gets list of all members in workspace',
      test: async () => {
        const response = await request(app.getHttpServer())
          .get(`/workspace/${testState.workspace!.slug}/members`)
          .set('Authorization', `Bearer ${testState.teacherJwt}`)
          .expect(200);

        // Should have 11 members total: 10 anonymous + 1 teacher (workspace owner)
        expect(response.body.data).toHaveLength(11);

        // Verify all anonymous members are in the list
        for (const expectedMember of mockData.anonymousMembers) {
          const foundMember = response.body.data.find(
            (member: any) => member.name === expectedMember.name,
          );
          expect(foundMember).toBeTruthy();
          expect(foundMember.roles).toEqual(
            expect.arrayContaining(expectedMember.roles),
          );
          expect(foundMember.user).toBeNull();
          expect(foundMember.workspaceId).toBe(testState.workspace!.id);
          expect(foundMember.preferedDanceRole).toBe(
            expectedMember.preferedDancingRole ?? null,
          );
          expect(foundMember.level).toBe(expectedMember.level ?? null);
        }

        // Verify teacher member is also in the list
        const teacherMember = response.body.data.find(
          (member: any) => member.user?.id === testState.teacher!.id,
        );
        expect(teacherMember).toBeTruthy();
        expect(teacherMember.roles).toContain(WorkspaceRole.OWNER);

        // Verify pagination metadata
        expect(response.body).toHaveProperty('meta');
        expect(response.body.meta.totalCount).toBe(11);
        expect(response.body.meta.count).toBe(11);
        expect(response.body.meta.page).toBe(1);
      },
    },
    {
      name: 'Teacher can filter members list',
      test: async () => {
        // Test filtering by dancing role
        const response = await request(app.getHttpServer())
          .get(`/workspace/${testState.workspace!.slug}/members`)
          .query({ roles: DanceRole.FOLLOWER })
          .set('Authorization', `Bearer ${testState.teacherJwt}`)
          .expect(200);

        // Should only return the student members (not the teacher/owner)
        expect(response.body.data).toHaveLength(
          mockData.anonymousMembers.filter(
            ({ preferedDancingRole }) =>
              preferedDancingRole === DanceRole.FOLLOWER,
          ).length,
        );

        for (const member of response.body.data) {
          expect(member.preferedDanceRole).toBe(DanceRole.FOLLOWER);
          expect(member.user).toBeNull(); // All should be anonymous
        }

        // Test filtering by level
        const response2 = await request(app.getHttpServer())
          .get(`/workspace/${testState.workspace!.slug}/members`)
          .query({ minLevel: DanceLevel.CONFIRMED })
          .set('Authorization', `Bearer ${testState.teacherJwt}`)
          .expect(200);

        // Should only return the student members (not the teacher/owner)
        expect(response2.body.data).toHaveLength(
          mockData.anonymousMembers.filter(
            ({ level }) => level >= DanceLevel.CONFIRMED,
          ).length,
        );

        for (const member of response2.body.data) {
          expect(member.level).toBeGreaterThanOrEqual(DanceLevel.CONFIRMED);
          expect(member.user).toBeNull(); // All should be anonymous
        }
      },
    },
    {
      name: 'Teacher can search members by name',
      test: async () => {
        // Test searching by name
        const searchTerm = 'Alice';
        const response = await request(app.getHttpServer())
          .get(`/workspace/${testState.workspace!.slug}/members`)
          .query({ search: searchTerm })
          .set('Authorization', `Bearer ${testState.teacherJwt}`)
          .expect(200);

        // Should find Alice Johnson
        expect(response.body.data.length).toBeGreaterThan(0);
        const aliceMember = response.body.data.find((member: any) =>
          member.name.includes(searchTerm),
        );
        expect(aliceMember).toBeTruthy();
        expect(aliceMember.name).toBe('Alice Johnson');
      },
    },
  ];

  setupTestSteps(testSteps);
});
