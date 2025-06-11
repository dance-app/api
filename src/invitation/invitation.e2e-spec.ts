import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { JwtModule } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import {
  InvitationStatus,
  WorkspaceRole,
  Member,
  Invitation,
} from '@prisma/client';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';

import { CreateWorkspaceInvitationDto } from './dto/create-invitation.dto';
import { InvitationModule } from './invitation.module';
import { MockMailService } from '../../test/mock-services/mock-mail.service';
import { MailService } from '../mail/mail.service';

import { AuthModule } from '@/auth/auth.module';
import { DatabaseModule } from '@/database/database.module';
import { PaginationModule } from '@/pagination/pagination.module';
import { signInTest, signUpTest } from '@/test/flows/common-tests';
import { TestAssertions } from '@/test/helpers/assertions';
import { TestDataFactory } from '@/test/helpers/mock-data';
import { PrismaTestingService } from '@/test/helpers/prisma-testing.service';
import { UserWithAccount } from '@/user/user.types';
import { WorkspaceWithMember } from '@/workspace/worspace.types';

describe('InvitationController (Integration)', () => {
  let app: INestApplication;
  let testService: PrismaTestingService;
  let mailService: MockMailService;

  // Test data
  let testUser: UserWithAccount;
  let testWorkspace: WorkspaceWithMember;
  let otherUser: UserWithAccount;
  let emptySeat: Member;
  let testUserJwt: string;

  const testData = {
    owner: TestDataFactory.createMockUserDto({
      email: 'owner@example.com',
      firstName: 'Test',
      lastName: 'Owner',
    }),
    otherUser: TestDataFactory.createMockUserDto({
      email: 'other@example.com',
      firstName: 'Other',
      lastName: 'User',
    }),
    workspace: TestDataFactory.createWorkspaceData({
      name: 'Test Workspace',
      slug: 'test-workspace',
    }),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        EventEmitterModule.forRoot(),
        DatabaseModule,
        PaginationModule,
        AuthModule,
        InvitationModule,
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        JwtModule.register({}),
      ],
    })
      .overrideProvider(MailService)
      .useClass(MockMailService)
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    testService = new PrismaTestingService();
    mailService = moduleRef.get<MockMailService>(MailService);
  });

  beforeEach(async () => {
    // Clean database
    await testService.reset();
    mailService.reset();

    // Create test users
    testUser = await testService.createUser(testData.owner);
    otherUser = await testService.createUser(testData.otherUser);

    // Create workspace with owner
    const { workspace } = await testService.createWorkspace(testUser.id, {
      name: testData.workspace.name,
      slug: testData.workspace.slug,
      members: [{ user: testUser, roles: [WorkspaceRole.OWNER] }],
    });
    testWorkspace = workspace;

    // Create empty member seat
    emptySeat = await testService.createMemberSeat(
      testUser.id,
      testWorkspace.id,
      {
        name: 'Jane Doe',
        roles: [WorkspaceRole.STUDENT],
      },
    );

    // Get JWT token for test user
    const tokens = await signInTest(
      app,
      testData.owner.email,
      testData.owner.password,
    );
    testUserJwt = tokens.accessToken;

    // Mock request.user for routes that need it
    app.use((req, res, next) => {
      req.user = testUser;
      next();
    });
  });

  afterAll(async () => {
    await testService.close();
    await app.close();
  });

  describe('POST /invitations/workspace/:slug', () => {
    it('should create a new workspace invitation for non-existing user', async () => {
      const inviteeEmail = TestDataFactory.createUniqueEmail('newuser');
      const createDto: CreateWorkspaceInvitationDto = {
        email: inviteeEmail,
        type: 'workspace',
        workspaceSlug: testWorkspace.slug,
        memberSeatId: emptySeat.id,
      };

      const response = await request(app.getHttpServer())
        .post(`/invitations/workspace/${testWorkspace.slug}`)
        .set('Authorization', `Bearer ${testUserJwt}`)
        .send(createDto)
        .expect(201);

      // Verify response structure
      TestAssertions.expectInvitationShape(response.body, 'WORKSPACE');
      expect(response.body).toEqual(
        expect.objectContaining({
          email: createDto.email,
          status: InvitationStatus.PENDING,
          workspaceId: testWorkspace.id,
          inviterId: testUser.id,
          memberSeatId: emptySeat.id,
        }),
      );

      // Verify invitation was created in database
      const invitation = await testService.client.invitation.findUnique({
        where: { id: response.body.id },
      });
      expect(invitation).toBeTruthy();
      expect(invitation!.email).toBe(createDto.email);

      // Verify member seat exists and is not linked yet
      const memberSeat = await testService.client.member.findUnique({
        where: { id: response.body.memberSeatId },
      });
      expect(memberSeat).toBeTruthy();
      expect(memberSeat!.userId).toBeNull(); // Not linked yet

      // Verify email was sent
      TestAssertions.expectEmailSent(
        mailService,
        createDto.email,
        'Workspace Invitation',
      );
    });

    it('should create a new invitation for existing user by ID', async () => {
      const createDto: CreateWorkspaceInvitationDto = {
        inviteeId: otherUser.id,
        workspaceSlug: testWorkspace.slug,
        memberSeatId: emptySeat.id,
        type: 'workspace',
      };

      const response = await request(app.getHttpServer())
        .post(`/invitations/workspace/${testWorkspace.slug}`)
        .set('Authorization', `Bearer ${testUserJwt}`)
        .send(createDto)
        .expect(201);

      expect(response.body).toEqual(
        expect.objectContaining({
          inviteeId: otherUser.id,
          status: InvitationStatus.PENDING,
          workspaceId: testWorkspace.id,
        }),
      );

      // No email should be sent for existing user invitations by ID
      expect(mailService.sentMails).toHaveLength(0);
    });

    it('should return 400 when user is already a member', async () => {
      const createDto: CreateWorkspaceInvitationDto = {
        inviteeId: testUser.id, // testUser is already a member
        workspaceSlug: testWorkspace.slug,
        memberSeatId: emptySeat.id,
        type: 'workspace',
      };

      await request(app.getHttpServer())
        .post(`/invitations/workspace/${testWorkspace.slug}`)
        .set('Authorization', `Bearer ${testUserJwt}`)
        .send(createDto)
        .expect(400);
    });

    it('should return 400 when pending invitation already exists', async () => {
      const duplicateEmail = TestDataFactory.createUniqueEmail('duplicate');
      const createDto: CreateWorkspaceInvitationDto = {
        email: duplicateEmail,
        workspaceSlug: testWorkspace.slug,
        memberSeatId: emptySeat.id,
        type: 'workspace',
      };

      // Create first invitation
      await request(app.getHttpServer())
        .post(`/invitations/workspace/${testWorkspace.slug}`)
        .set('Authorization', `Bearer ${testUserJwt}`)
        .send(createDto)
        .expect(201);

      // Try to create duplicate
      await request(app.getHttpServer())
        .post(`/invitations/workspace/${testWorkspace.slug}`)
        .set('Authorization', `Bearer ${testUserJwt}`)
        .send(createDto)
        .expect(400);
    });

    it('should return 403 when workspace not found', async () => {
      const createDto: CreateWorkspaceInvitationDto = {
        email: TestDataFactory.createUniqueEmail('test'),
        workspaceSlug: 'non-existent',
        memberSeatId: emptySeat.id,
        type: 'workspace',
      };

      await request(app.getHttpServer())
        .post(`/invitations/workspace/non-existent`)
        .set('Authorization', `Bearer ${testUserJwt}`)
        .send(createDto)
        .expect(403);
    });

    it('should return 400 when neither email nor inviteeId provided', async () => {
      const createDto: Partial<CreateWorkspaceInvitationDto> = {
        workspaceSlug: testWorkspace.slug,
        memberSeatId: emptySeat.id,
        type: 'workspace',
      };

      await request(app.getHttpServer())
        .post(`/invitations/workspace/${testWorkspace.slug}`)
        .set('Authorization', `Bearer ${testUserJwt}`)
        .send(createDto)
        .expect(400);
    });
  });

  describe('GET /invitations/workspace/:slug', () => {
    let testInvitations: Invitation[];

    beforeEach(async () => {
      // Create test invitations using helper method
      testInvitations = await testService.createWorkspaceInvitations(
        testWorkspace.id,
        testUser.id,
        [
          {
            email: TestDataFactory.createUniqueEmail('user1'),
            firstName: 'User',
            lastName: 'One',
            memberName: 'User One',
            roles: [WorkspaceRole.STUDENT],
          },
          {
            email: TestDataFactory.createUniqueEmail('user2'),
            firstName: 'User',
            lastName: 'Two',
            memberName: 'User Two',
            roles: [WorkspaceRole.STUDENT],
          },
        ],
      );
    });

    it('should return all invitations for a workspace', async () => {
      const response = await request(app.getHttpServer())
        .get(`/invitations/workspace/${testWorkspace.slug}`)
        .set('Authorization', `Bearer ${testUserJwt}`)
        .expect(200);

      expect(response.body).toHaveLength(2);

      // Verify first invitation
      expect(response.body[0]).toEqual(
        expect.objectContaining({
          email: testInvitations[0].email,
          workspaceId: testWorkspace.id,
          status: InvitationStatus.PENDING,
        }),
      );

      // Verify second invitation
      expect(response.body[1]).toEqual(
        expect.objectContaining({
          email: testInvitations[1].email,
          workspaceId: testWorkspace.id,
          status: InvitationStatus.PENDING,
        }),
      );
    });

    it('should return 403 when workspace not found', async () => {
      await request(app.getHttpServer())
        .get('/invitations/workspace/non-existent')
        .set('Authorization', `Bearer ${testUserJwt}`)
        .expect(403);
    });
  });

  describe('GET /invitations/token/:token', () => {
    let testInvitation: Invitation;

    beforeEach(async () => {
      const invitations = await testService.createWorkspaceInvitations(
        testWorkspace.id,
        testUser.id,
        [
          {
            email: TestDataFactory.createUniqueEmail('test'),
            firstName: 'Test',
            lastName: 'User',
            memberName: 'Test User',
            roles: [WorkspaceRole.STUDENT],
          },
        ],
      );
      testInvitation = invitations[0];
    });

    it('should return invitation details by token', async () => {
      const response = await request(app.getHttpServer())
        .get(`/invitations/token/${testInvitation.token}`)
        .set('Authorization', `Bearer ${testUserJwt}`)
        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          id: testInvitation.id,
          token: testInvitation.token,
          email: testInvitation.email,
          workspaceId: testWorkspace.id,
        }),
      );
    });

    it('should return 404 when token not found', async () => {
      const randomToken = uuidv4();
      await request(app.getHttpServer())
        .get(`/invitations/token/${randomToken}`)
        .set('Authorization', `Bearer ${testUserJwt}`)
        .expect(404);
    });
  });

  describe('POST /invitations/accept/:token', () => {
    let testInvitation: Invitation;
    let memberSeat: Member;
    let inviteeUser: UserWithAccount;
    let inviteeJwt: string;
    beforeEach(async () => {
      // Create user who will accept the invitation
      const inviteeData = await testService.createMockUser();
      inviteeUser = inviteeData.user;

      const inviteeCreds = await signInTest(
        app,
        inviteeData.email,
        inviteeData.password,
      );
      inviteeJwt = inviteeCreds.accessToken;
      // Create invitation for this user
      const invitations = await testService.createWorkspaceInvitations(
        testWorkspace.id,
        testUser.id,
        [
          {
            email: inviteeUser.accounts[0].email,
            firstName: inviteeUser.firstName,
            lastName: inviteeUser.lastName,
            memberName: `${inviteeUser.firstName} ${inviteeUser.lastName}`,
            roles: [WorkspaceRole.STUDENT],
          },
        ],
      );
      testInvitation = invitations[0];

      // Get the member seat
      memberSeat = (await testService.client.member.findUnique({
        where: { id: testInvitation.memberSeatId! },
      })) as Member;

      // Update mock user for acceptance
      app.use((req, res, next) => {
        req.user = inviteeUser;
        next();
      });
    });

    it('should accept an invitation successfully', async () => {
      const response = await request(app.getHttpServer())
        .post(`/invitations/accept/${testInvitation.token}`)
        .set('Authorization', `Bearer ${inviteeJwt}`)
        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          id: testInvitation.id,
          status: InvitationStatus.ACCEPTED,
          inviteeId: inviteeUser.id,
        }),
      );

      // Verify member was linked to user
      const updatedMember = await testService.client.member.findUnique({
        where: { id: memberSeat.id },
      });
      expect(updatedMember!.userId).toBe(inviteeUser.id);

      // Verify invitation status in database
      const updatedInvitation = await testService.client.invitation.findUnique({
        where: { id: testInvitation.id },
      });
      expect(updatedInvitation!.status).toBe(InvitationStatus.ACCEPTED);
    });

    it('should return 404 when token not found', async () => {
      const randomToken = uuidv4();
      await request(app.getHttpServer())
        .post(`/invitations/accept/${randomToken}`)
        .set('Authorization', `Bearer ${inviteeJwt}`)
        .expect(404);
    });

    it('should return 400 when invitation is expired', async () => {
      // Create expired invitation
      const expiredInvitation = await testService.createExpiredInvitation(
        testWorkspace.id,
        testUser.id,
        inviteeUser.accounts[0].email,
      );

      await request(app.getHttpServer())
        .post(`/invitations/accept/${expiredInvitation.token}`)
        .set('Authorization', `Bearer ${inviteeJwt}`)
        .expect(400);
    });
  });

  describe('POST /invitations/decline/:token', () => {
    let testInvitation: Invitation;
    let inviteeUser: UserWithAccount;
    let inviteeJwt: string;

    beforeEach(async () => {
      // Create user who will decline the invitation
      const inviteeData = await testService.createMockUser();
      inviteeUser = inviteeData.user;

      const inviteeCreds = await signInTest(
        app,
        inviteeData.email,
        inviteeData.password,
      );
      inviteeJwt = inviteeCreds.accessToken;

      // Create invitation
      const invitations = await testService.createWorkspaceInvitations(
        testWorkspace.id,
        testUser.id,
        [
          {
            email: inviteeUser.accounts[0].email,
            firstName: inviteeUser.firstName,
            lastName: inviteeUser.lastName,
            memberName: `${inviteeUser.firstName} ${inviteeUser.lastName}`,
            roles: [WorkspaceRole.STUDENT],
          },
        ],
      );
      testInvitation = invitations[0];

      // Update mock user for declining
      app.use((req, res, next) => {
        req.user = inviteeUser;
        next();
      });
    });

    it('should decline an invitation successfully', async () => {
      const response = await request(app.getHttpServer())
        .post(`/invitations/decline/${testInvitation.token}`)
        .set('Authorization', `Bearer ${inviteeJwt}`)
        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          id: testInvitation.id,
          status: InvitationStatus.DECLINED,
          inviteeId: inviteeUser.id,
        }),
      );

      // Verify invitation status in database
      const updatedInvitation = await testService.client.invitation.findUnique({
        where: { id: testInvitation.id },
      });
      expect(updatedInvitation!.status).toBe(InvitationStatus.DECLINED);
    });

    it('should return 404 when token not found', async () => {
      const randomToken = uuidv4();
      await request(app.getHttpServer())
        .post(`/invitations/decline/${randomToken}`)
        .set('Authorization', `Bearer ${inviteeJwt}`)
        .expect(404);
    });

    it('should return 400 when invitation is already declined', async () => {
      // First decline
      await request(app.getHttpServer())
        .post(`/invitations/decline/${testInvitation.token}`)
        .set('Authorization', `Bearer ${inviteeJwt}`)
        .expect(200);

      // Try to decline again
      await request(app.getHttpServer())
        .post(`/invitations/decline/${testInvitation.token}`)
        .set('Authorization', `Bearer ${inviteeJwt}`)
        .expect(400);
    });
  });

  describe('End-to-End Workflow', () => {
    it('should complete full invitation workflow', async () => {
      const workflowEmail = TestDataFactory.createUniqueEmail('workflow');

      // 1. Create invitation
      const createDto: CreateWorkspaceInvitationDto = {
        email: workflowEmail,
        workspaceSlug: testWorkspace.slug,
        memberSeatId: emptySeat.id,
        type: 'workspace',
      };

      const createResponse = await request(app.getHttpServer())
        .post(`/invitations/workspace/${testWorkspace.slug}`)
        .set('Authorization', `Bearer ${testUserJwt}`)
        .send(createDto)
        .expect(201);

      const invitationToken = createResponse.body.token;

      const { accessToken, user } = await signUpTest(
        app,
        testService.client,
        mailService,
        workflowEmail,
        'Workflow',
        'User',
        'password123',
      );

      // 2. Get invitation by token (as if user clicked link)
      const getResponse = await request(app.getHttpServer())
        .get(`/invitations/token/${invitationToken}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(getResponse.body.status).toBe(InvitationStatus.PENDING);

      // 4. Accept invitation
      const acceptResponse = await request(app.getHttpServer())
        .post(`/invitations/accept/${invitationToken}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(acceptResponse.body.status).toBe(InvitationStatus.ACCEPTED);
      expect(acceptResponse.body.inviteeId).toBe(user.id);

      // 5. Verify user is now a member
      const member = await testService.client.member.findUnique({
        where: { id: acceptResponse.body.memberSeatId },
      });
      expect(member!.userId).toBe(user.id);

      // 6. Verify invitation appears in workspace invitations list
      const listResponse = await request(app.getHttpServer())
        .get(`/invitations/workspace/${testWorkspace.slug}`)
        .set('Authorization', `Bearer ${testUserJwt}`)
        .expect(200);

      const acceptedInvitation = listResponse.body.find(
        (inv: any) => inv.id === createResponse.body.id,
      );
      expect(acceptedInvitation.status).toBe(InvitationStatus.ACCEPTED);
    });
  });
});
