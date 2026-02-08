/**
 * pnpm run test:e2e src/member/member.e2e.spec.ts
 */

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DanceRole, WorkspaceRole } from '@prisma/client';
import request from 'supertest';

import { signInTest } from '../../test/flows/common-tests';
import { MockMailService } from '../../test/mock-mail.service';
import { PrismaTestingService } from '../../test/prisma-testing.service';
import { AppModule } from '../app.module';

import { ERROR_MESSAGES } from '@/lib/constants';
import { generateId, ID_PREFIXES } from '@/lib/id-generator';
import { MailService } from '@/mail/mail.service';

describe('Workspace Members CRUD (e2e)', () => {
  let app: INestApplication;
  let moduleFixture: TestingModule;
  const prismaTesting = new PrismaTestingService();
  let mailService: MockMailService;

  const ownerCredentials = {
    email: 'member.owner@example.com',
    password: 'MemberOwner123!',
    firstName: 'OwnerFirst',
    lastName: 'OwnerLast',
  };

  const teacherCredentials = {
    email: 'member.teacher@example.com',
    password: 'MemberTeacher123!',
    firstName: 'TeacherFirst',
    lastName: 'TeacherLast',
  };

  const studentCredentials = {
    email: 'member.student@example.com',
    password: 'MemberStudent123!',
    firstName: 'StudentFirst',
    lastName: 'StudentLast',
  };

  const outsiderCredentials = {
    email: 'member.outsider@example.com',
    password: 'MemberOutsider123!',
    firstName: 'Member',
    lastName: 'Outsider',
  };

  let ownerAccessToken: string;
  let teacherAccessToken: string;
  let studentAccessToken: string;
  let outsiderAccessToken: string;
  let workspaceId: string;
  let workspaceSlug: string;
  let ownerId: string;
  let teacherId: string;
  let studentId: string;
  let ownerMemberId: string;
  let teacherMemberId: string;
  let studentMemberId: string;
  let noAccountUserId: string;

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(MailService)
      .useClass(MockMailService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    mailService = moduleFixture.get(MailService);

    await prismaTesting.reset();
    mailService.reset();

    const owner = await prismaTesting.createUser(
      ownerCredentials.email,
      ownerCredentials.password,
      ownerCredentials.firstName,
      ownerCredentials.lastName,
      true,
      false,
    );
    ownerId = owner.id;

    const teacher = await prismaTesting.createUser(
      teacherCredentials.email,
      teacherCredentials.password,
      teacherCredentials.firstName,
      teacherCredentials.lastName,
      true,
      false,
    );
    teacherId = teacher.id;

    const student = await prismaTesting.createUser(
      studentCredentials.email,
      studentCredentials.password,
      studentCredentials.firstName,
      studentCredentials.lastName,
      true,
      false,
    );
    studentId = student.id;

    await prismaTesting.createUser(
      outsiderCredentials.email,
      outsiderCredentials.password,
      outsiderCredentials.firstName,
      outsiderCredentials.lastName,
      true,
      false,
    );
    outsiderAccessToken = (
      await signInTest(
        app,
        outsiderCredentials.email,
        outsiderCredentials.password,
      )
    ).accessToken;

    ownerAccessToken = (
      await signInTest(app, ownerCredentials.email, ownerCredentials.password)
    ).accessToken;
    teacherAccessToken = (
      await signInTest(
        app,
        teacherCredentials.email,
        teacherCredentials.password,
      )
    ).accessToken;
    studentAccessToken = (
      await signInTest(
        app,
        studentCredentials.email,
        studentCredentials.password,
      )
    ).accessToken;
    // Create a user without any account data
    const noAccountUser = await prismaTesting.client.user.create({
      data: {
        id: generateId(ID_PREFIXES.USER),
        firstName: 'NoAccountFirst',
        lastName: 'NoAccountLast',
      },
    });
    noAccountUserId = noAccountUser.id;

    const slugBase = `members-${Date.now()}`;
    const createWorkspaceResponse = await request(app.getHttpServer())
      .post('/workspaces')
      .auth(ownerAccessToken, { type: 'bearer' })
      .send({
        name: 'Members Workspace',
        slug: slugBase,
      })
      .expect(201);

    workspaceId = createWorkspaceResponse.body.data.id;
    workspaceSlug = createWorkspaceResponse.body.data.slug;

    const ownerMember = await prismaTesting.client.member.findFirst({
      where: {
        workspaceId,
        userId: ownerId,
      },
    });
    ownerMemberId = ownerMember!.id;

    const teacherMember = await prismaTesting.client.member.create({
      data: {
        id: generateId(ID_PREFIXES.MEMBER),
        createdById: ownerId,
        userId: teacherId,
        workspaceId,
        roles: [WorkspaceRole.TEACHER],
      },
    });
    teacherMemberId = teacherMember.id;

    const studentMember = await prismaTesting.client.member.create({
      data: {
        id: generateId(ID_PREFIXES.MEMBER),
        createdById: ownerId,
        userId: studentId,
        workspaceId,
        roles: [WorkspaceRole.STUDENT],
      },
    });
    studentMemberId = studentMember.id;

    await prismaTesting.client.member.create({
      data: {
        id: generateId(ID_PREFIXES.MEMBER),
        createdById: ownerId,
        userId: noAccountUserId,
        workspaceId,
        roles: [WorkspaceRole.STUDENT],
      },
    });

    await prismaTesting.client.member.create({
      data: {
        id: generateId(ID_PREFIXES.MEMBER),
        createdById: ownerId,
        workspaceId,
        name: 'Anonymous Member',
        roles: [WorkspaceRole.STUDENT],
        preferredDanceRole: DanceRole.LEADER,
        level: 100,
      },
    });

    const bulkAnonymous = Array.from({ length: 9 }).map((_, index) => ({
      id: generateId(ID_PREFIXES.MEMBER),
      createdById: ownerId,
      workspaceId,
      name: `Guest Member ${index + 1}`,
      roles: [WorkspaceRole.STUDENT],
      preferredDanceRole: DanceRole.FOLLOWER,
      level: 100,
    }));

    await prismaTesting.client.member.createMany({
      data: bulkAnonymous,
    });
  });

  afterAll(async () => {
    await prismaTesting.close();
    await app.close();
    await moduleFixture.close();
  });

  describe('GET /workspaces/:slug/members', () => {
    it('returns members with metadata and correct payload', async () => {
      const response = await request(app.getHttpServer())
        .get(`/workspaces/${workspaceSlug}/members`)
        .auth(ownerAccessToken, { type: 'bearer' })
        .expect(200);

      // Check overall response structure and meta
      expect(response.body).toEqual(
        expect.objectContaining({
          data: expect.any(Array),
          error: null,
          meta: expect.objectContaining({
            totalCount: expect.any(Number),
            count: expect.any(Number),
            page: expect.any(Number),
            pages: expect.any(Number),
            limit: expect.any(Number),
            offset: expect.any(Number),
          }),
        }),
      );
      expect(response.body.data.length).toBeGreaterThanOrEqual(10);

      // Check that owner member is included and has correct data
      const ownerMember = response.body.data.find(
        (member: any) => member.id === ownerMemberId,
      );
      expect(ownerMember.id).toBe(ownerMemberId);
      expect(ownerMember.name).toBe(null);
      expect(ownerMember.preferredDanceRole).toBe(null);
      expect(ownerMember.roles).toContain(WorkspaceRole.OWNER);
      expect(ownerMember.user.createdAt).toBeDefined();
      expect(ownerMember.user.updatedAt).toBeDefined();
      expect(ownerMember.user.id).toBe(ownerId);
      expect(ownerMember.user.firstName).toBe(ownerCredentials.firstName);
      expect(ownerMember.user.lastName).toBe(ownerCredentials.lastName);
      expect(ownerMember.user.accounts[0].email).toBe(ownerCredentials.email);
      expect(ownerMember.user.accounts[0].isEmailVerified).toBe(true);

      // Check that teacher member is included and has correct data
      const teacherMember = response.body.data.find(
        (m) => m.id === teacherMemberId,
      );
      expect(teacherMember.id).toBe(teacherMemberId);
      expect(teacherMember.name).toBe(null);
      expect(teacherMember.preferredDanceRole).toBe(null);
      expect(teacherMember.roles).toContain(WorkspaceRole.TEACHER);
      expect(teacherMember.user.createdAt).toBeDefined();
      expect(teacherMember.user.updatedAt).toBeDefined();
      expect(teacherMember.user.id).toBe(teacherId);
      expect(teacherMember.user.firstName).toBe(teacherCredentials.firstName);
      expect(teacherMember.user.lastName).toBe(teacherCredentials.lastName);
      expect(teacherMember.user.accounts[0].email).toBe(
        teacherCredentials.email,
      );
      expect(teacherMember.user.accounts[0].isEmailVerified).toBe(true);

      // First member is the last one created, which is Guest Member 9
      const firstMember = response.body.data[0];
      expect(firstMember.id).toBeDefined();
      expect(firstMember.name).toBe('Guest Member 9');
      expect(firstMember.preferredDanceRole).toBe(DanceRole.FOLLOWER);
      expect(firstMember.roles).toContain(WorkspaceRole.STUDENT);
      expect(firstMember.user).toBe(null);
    });

    it('returns 403 for student role', async () => {
      await request(app.getHttpServer())
        .get(`/workspaces/${workspaceSlug}/members`)
        .auth(studentAccessToken, { type: 'bearer' })
        .expect(403);
    });

    it('returns 403 for non-member', async () => {
      await request(app.getHttpServer())
        .get(`/workspaces/${workspaceSlug}/members`)
        .auth(outsiderAccessToken, { type: 'bearer' })
        .expect(403);
    });

    it('returns 401 when not authenticated', async () => {
      await request(app.getHttpServer())
        .get(`/workspaces/${workspaceSlug}/members`)
        .expect(401);
    });

    it('returns correct pagination payload', async () => {
      const responsePage1 = await request(app.getHttpServer())
        .get(`/workspaces/${workspaceSlug}/members?limit=2&offset=0`)
        .auth(ownerAccessToken, { type: 'bearer' })
        .expect(200);

      expect(responsePage1.body.meta.totalCount).toBe(14);
      expect(responsePage1.body.meta.count).toBe(2);
      expect(responsePage1.body.meta.page).toBe(1);
      expect(responsePage1.body.meta.pages).toBe(7);
      expect(responsePage1.body.meta.limit).toBe(2);
      expect(responsePage1.body.meta.offset).toBe(0);

      const responsePage2 = await request(app.getHttpServer())
        .get(`/workspaces/${workspaceSlug}/members?limit=2&offset=2`)
        .auth(ownerAccessToken, { type: 'bearer' })
        .expect(200);

      expect(responsePage2.body.meta.totalCount).toBe(14);
      expect(responsePage2.body.meta.count).toBe(2);
      expect(responsePage2.body.meta.page).toBe(2);
      expect(responsePage2.body.meta.pages).toBe(7);
      expect(responsePage2.body.meta.limit).toBe(2);
      expect(responsePage2.body.meta.offset).toBe(2);

      const responseExceedPage = await request(app.getHttpServer())
        .get(`/workspaces/${workspaceSlug}/members?limit=2&offset=14`)
        .auth(ownerAccessToken, { type: 'bearer' })
        .expect(200);

      expect(responseExceedPage.body.meta.totalCount).toBe(14);
      expect(responseExceedPage.body.meta.count).toBe(0);
      expect(responseExceedPage.body.meta.page).toBe(8);
      expect(responseExceedPage.body.meta.pages).toBe(7);
      expect(responseExceedPage.body.meta.limit).toBe(2);
      expect(responseExceedPage.body.meta.offset).toBe(14);
    });

    it('supports roles filter for LEADER', async () => {
      const response = await request(app.getHttpServer())
        .get(`/workspaces/${workspaceSlug}/members?roles=LEADER`)
        .auth(ownerAccessToken, { type: 'bearer' })
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toEqual(
        expect.objectContaining({
          name: 'Anonymous Member',
          preferredDanceRole: DanceRole.LEADER,
        }),
      );
    });

    it('supports roles filter for FOLLOWER', async () => {
      const response = await request(app.getHttpServer())
        .get(`/workspaces/${workspaceSlug}/members?roles=FOLLOWER`)
        .auth(ownerAccessToken, { type: 'bearer' })
        .expect(200);

      expect(response.body.data.length).toBe(9);
      for (const member of response.body.data) {
        expect(member.preferredDanceRole).toBe(DanceRole.FOLLOWER);
      }
    });

    it('supports roles filter for LEADER,FOLLOWER', async () => {
      const response = await request(app.getHttpServer())
        .get(`/workspaces/${workspaceSlug}/members?roles=LEADER,FOLLOWER`)
        .auth(ownerAccessToken, { type: 'bearer' })
        .expect(200);

      expect(response.body.data.length).toBe(10);
      for (const member of response.body.data) {
        expect([DanceRole.LEADER, DanceRole.FOLLOWER]).toContain(
          member.preferredDanceRole,
        );
      }
    });

    it('returns 400 for invalid roles filter', async () => {
      const response = await request(app.getHttpServer())
        .get(`/workspaces/${workspaceSlug}/members?roles=NOT_A_ROLE`)
        .auth(ownerAccessToken, { type: 'bearer' })
        .expect(400);

      expect(response.body.statusCode).toBe(400);
      expect(response.body.error).toBe('Bad Request');
      expect(response.body.message[0]).toBe(
        ERROR_MESSAGES.DANCE_ROLE_FILTER_INVALID,
      );

      console.log('++++', response.body);
    });

    it.skip('supports search by user first name', async () => {
      const response = await request(app.getHttpServer())
        .get(
          `/workspaces/${workspaceSlug}/members?search=${encodeURIComponent(
            teacherCredentials.firstName,
          )}`,
        )
        .auth(ownerAccessToken, { type: 'bearer' })
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toEqual(
        expect.objectContaining({
          id: teacherMemberId,
          user: expect.objectContaining({
            id: teacherId,
            firstName: teacherCredentials.firstName,
          }),
        }),
      );
    });

    it.skip('supports search by user last name', async () => {
      const response = await request(app.getHttpServer())
        .get(
          `/workspaces/${workspaceSlug}/members?search=${encodeURIComponent(
            studentCredentials.lastName,
          )}`,
        )
        .auth(ownerAccessToken, { type: 'bearer' })
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toEqual(
        expect.objectContaining({
          id: studentMemberId,
          user: expect.objectContaining({
            id: studentId,
            lastName: studentCredentials.lastName,
          }),
        }),
      );
    });

    it.skip('supports search by account email', async () => {
      const response = await request(app.getHttpServer())
        .get(
          `/workspaces/${workspaceSlug}/members?search=${encodeURIComponent(
            teacherCredentials.email,
          )}`,
        )
        .auth(ownerAccessToken, { type: 'bearer' })
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toEqual(
        expect.objectContaining({
          id: teacherMemberId,
          user: expect.objectContaining({
            id: teacherId,
            firstName: teacherCredentials.firstName,
            lastName: teacherCredentials.lastName,
          }),
        }),
      );
    });

    it.skip('supports search by member display name', async () => {
      const response = await request(app.getHttpServer())
        .get(
          `/workspaces/${workspaceSlug}/members?search=${encodeURIComponent(
            'Anonymous',
          )}`,
        )
        .auth(ownerAccessToken, { type: 'bearer' })
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toEqual(
        expect.objectContaining({
          name: 'Anonymous Member',
          user: null,
        }),
      );
    });

    it.skip('supports search by user name when user has no account', async () => {
      const response = await request(app.getHttpServer())
        .get(
          `/workspaces/${workspaceSlug}/members?search=${encodeURIComponent(
            'NoAccountFirst',
          )}`,
        )
        .auth(ownerAccessToken, { type: 'bearer' })
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toEqual(
        expect.objectContaining({
          user: expect.objectContaining({
            id: noAccountUserId,
            firstName: 'NoAccountFirst',
            lastName: 'NoAccountLast',
          }),
        }),
      );
    });
  });

  describe.skip('POST /workspaces/:slug/members', () => {
    it('creates a member seat and returns payload', async () => {
      const payload = {
        email: 'new.member@example.com',
        memberName: 'New Member',
        roles: [WorkspaceRole.STUDENT],
        preferredDanceRole: DanceRole.FOLLOWER,
        level: 100,
      };

      const response = await request(app.getHttpServer())
        .post(`/workspaces/${workspaceSlug}/members`)
        .auth(ownerAccessToken, { type: 'bearer' })
        .send(payload)
        .expect(201);

      expect(response.body).toEqual(
        expect.objectContaining({
          data: expect.objectContaining({
            id: expect.any(String),
            name: payload.memberName,
            roles: payload.roles,
            preferredDanceRole: payload.preferredDanceRole,
            level: payload.level,
            workspaceId,
            user: null,
          }),
          error: null,
        }),
      );
      expect(response.body.data.id.startsWith(ID_PREFIXES.MEMBER)).toBe(true);

      const dbMember = await prismaTesting.client.member.findUnique({
        where: { id: response.body.data.id },
      });
      expect(dbMember).toBeTruthy();
      expect(dbMember?.name).toBe(payload.memberName);
      expect(dbMember?.preferredDanceRole).toBe(payload.preferredDanceRole);
      expect(dbMember?.level).toBe(payload.level);
    });

    it('returns 400 for invalid email', async () => {
      await request(app.getHttpServer())
        .post(`/workspaces/${workspaceSlug}/members`)
        .auth(ownerAccessToken, { type: 'bearer' })
        .send({
          email: 'not-an-email',
          memberName: 'Invalid Email',
          roles: [WorkspaceRole.STUDENT],
        })
        .expect(400);
    });

    it('returns 400 when roles are missing', async () => {
      await request(app.getHttpServer())
        .post(`/workspaces/${workspaceSlug}/members`)
        .auth(ownerAccessToken, { type: 'bearer' })
        .send({
          memberName: 'Missing Roles',
        })
        .expect(400);
    });

    it('returns 400 for invalid roles', async () => {
      await request(app.getHttpServer())
        .post(`/workspaces/${workspaceSlug}/members`)
        .auth(ownerAccessToken, { type: 'bearer' })
        .send({
          memberName: 'Invalid Roles',
          roles: ['NOT_A_ROLE'],
        })
        .expect(400);
    });

    it('returns 400 for invalid preferredDanceRole', async () => {
      await request(app.getHttpServer())
        .post(`/workspaces/${workspaceSlug}/members`)
        .auth(ownerAccessToken, { type: 'bearer' })
        .send({
          memberName: 'Invalid Role',
          roles: [WorkspaceRole.STUDENT],
          preferredDanceRole: 'NOT_A_DANCE_ROLE',
        })
        .expect(400);
    });

    it('returns 400 for invalid level', async () => {
      await request(app.getHttpServer())
        .post(`/workspaces/${workspaceSlug}/members`)
        .auth(ownerAccessToken, { type: 'bearer' })
        .send({
          memberName: 'Invalid Level',
          roles: [WorkspaceRole.STUDENT],
          level: 999,
        })
        .expect(400);
    });

    it('returns 400 when user is already a member', async () => {
      await request(app.getHttpServer())
        .post(`/workspaces/${workspaceSlug}/members`)
        .auth(ownerAccessToken, { type: 'bearer' })
        .send({
          userId: ownerId,
          memberName: 'Duplicate Owner',
          roles: [WorkspaceRole.STUDENT],
        })
        .expect(400);
    });
  });

  describe.skip('GET /workspaces/:slug/members/:id', () => {
    it('returns member details (user omitted in current response)', async () => {
      const response = await request(app.getHttpServer())
        .get(`/workspaces/${workspaceSlug}/members/${teacherMemberId}`)
        .auth(ownerAccessToken, { type: 'bearer' })
        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          data: expect.objectContaining({
            id: teacherMemberId,
            roles: [WorkspaceRole.TEACHER],
            workspaceId,
            user: null,
          }),
          error: null,
        }),
      );
    });

    it('returns null data when member does not exist', async () => {
      const response = await request(app.getHttpServer())
        .get(
          `/workspaces/${workspaceSlug}/members/${ID_PREFIXES.MEMBER}_00000000-0000-0000-0000-000000000000`,
        )
        .auth(ownerAccessToken, { type: 'bearer' })
        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          data: null,
          error: null,
        }),
      );
    });
  });

  describe.skip('DELETE /workspaces/:slug/members/:memberId', () => {
    it('allows owner to delete non-owner member', async () => {
      await request(app.getHttpServer())
        .delete(`/workspaces/${workspaceSlug}/members/${teacherMemberId}`)
        .auth(ownerAccessToken, { type: 'bearer' })
        .expect(204);

      const dbMember = await prismaTesting.client.member.findUnique({
        where: { id: teacherMemberId },
      });
      expect(dbMember).toBeNull();
    });

    it('rejects teacher deleting owner', async () => {
      await request(app.getHttpServer())
        .delete(`/workspaces/${workspaceSlug}/members/${ownerMemberId}`)
        .auth(teacherAccessToken, { type: 'bearer' })
        .expect(401);

      const dbOwner = await prismaTesting.client.member.findUnique({
        where: { id: ownerMemberId },
      });
      expect(dbOwner).toBeTruthy();
    });

    it('returns 404 when deleting non-existent member', async () => {
      await request(app.getHttpServer())
        .delete(
          `/workspaces/${workspaceSlug}/members/${ID_PREFIXES.MEMBER}_00000000-0000-0000-0000-000000000000`,
        )
        .auth(ownerAccessToken, { type: 'bearer' })
        .expect(404);
    });
  });

  describe.skip('DELETE /workspaces/:slug/members (leave workspace)', () => {
    it('allows teacher to leave workspace', async () => {
      await request(app.getHttpServer())
        .delete(`/workspaces/${workspaceSlug}/members`)
        .auth(teacherAccessToken, { type: 'bearer' })
        .expect(204);

      const dbMember = await prismaTesting.client.member.findUnique({
        where: { id: teacherMemberId },
      });
      expect(dbMember).toBeNull();
    });

    it('returns 403 for student role', async () => {
      await request(app.getHttpServer())
        .delete(`/workspaces/${workspaceSlug}/members`)
        .auth(studentAccessToken, { type: 'bearer' })
        .expect(403);

      const dbMember = await prismaTesting.client.member.findUnique({
        where: { id: studentMemberId },
      });
      expect(dbMember).toBeTruthy();
    });
  });
});
