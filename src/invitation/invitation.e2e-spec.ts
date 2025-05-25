import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { JwtModule } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { InvitationStatus, WorkspaceRole, Member } from '@prisma/client';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';

import { CreateWorkspaceInvitationDto } from './dto/create-invitation.dto';
import { InvitationModule } from './invitation.module';
import { MockMailService } from '../../test/mock-mail.service';
import { MailService } from '../mail/mail.service';

import { AuthModule } from '@/auth/auth.module';
import { DatabaseModule } from '@/database/database.module';
import { PaginationModule } from '@/pagination/pagination.module';
import { signInTest } from '@/test/flows/common-tests';
import { PrismaTestingService } from '@/test/prisma-testing.service';
import { UserWithAccount } from '@/user/user.types';
import { WorkspaceWithMember } from '@/workspace/worspace.types';

describe('InvitationController (Integration)', () => {
  const testUserDto = {
    email: 'john@example.com',
    password: 'password1',
    firstName: 'John',
    lastName: 'Doe',
  };
  const otherUserDto = {
    email: 'jane@example.com',
    password: 'password2',
    firstName: 'Jane',
    lastName: 'Smith',
  };
  let testUser: UserWithAccount;
  let testWorkspace: WorkspaceWithMember;
  let otherUser: UserWithAccount;
  let emptySeat: Member;

  let app: INestApplication;
  const prismaTesting = new PrismaTestingService();
  let mailService: MockMailService;

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

    mailService = moduleRef.get<MockMailService>(MailService);
  });

  beforeEach(async () => {
    // Clean database
    await prismaTesting.reset();
    mailService.reset();

    testUser = await prismaTesting.createUser(
      testUserDto.email,
      testUserDto.password,
      testUserDto.firstName,
      testUserDto.lastName,
    );
    otherUser = await prismaTesting.createUser(
      otherUserDto.email,
      otherUserDto.password,
      otherUserDto.firstName,
      otherUserDto.lastName,
    );

    testWorkspace = await prismaTesting.createWorkspace(
      'Test Workspace',
      'test-workspace',
      testUser.id,
      [testUser],
      [WorkspaceRole.OWNER],
    );

    emptySeat = await prismaTesting.createMemberSeat(
      testUser.id,
      testWorkspace.id,
      [WorkspaceRole.STUDENT],
      'Jane Doe',
    );

    // Mock request.user for each test
    app.use((req, res, next) => {
      req.user = testUser;
      next();
    });
  });

  afterAll(async () => {
    await prismaTesting.close();
    await app.close();
  });

  describe('POST /invitations', () => {
    let testUserJwt;
    beforeEach(async () => {
      testUserJwt = (
        await signInTest(app, testUserDto.email, testUserDto.password)
      ).accessToken;
    });
    it('should create a new workspace invitation for non-existing user', async () => {
      const createDto: CreateWorkspaceInvitationDto = {
        email: 'newuser@example.com',
        type: 'workspace',
        workspaceSlug: testWorkspace.slug,
        memberSeatId: emptySeat.id,
      };
      /*const { accessToken } = await signInTest(
        app,
        testUser.accounts[0].email,
        testUser.accounts[1].password,
      );*/
      const response = await request(app.getHttpServer())
        .post(`/invitations/workspace/${testWorkspace.slug}`)
        .set('Authorization', `Bearer ${testUserJwt}`)
        .send(createDto)
        .expect(201);

      expect(response.body).toEqual(
        expect.objectContaining({
          email: createDto.email,
          status: InvitationStatus.PENDING,
          workspaceId: testWorkspace.id,
          inviterId: testUser.id,
        }),
      );

      // Verify invitation was created in database
      const invitation = await prismaTesting.client.invitation.findUnique({
        where: { id: response.body.id },
      });
      expect(invitation).toBeTruthy();
      expect(invitation!.email).toBe(createDto.email);

      // Verify member seat was created
      const memberSeat = await prismaTesting.client.member.findUnique({
        where: { id: response.body.memberSeatId },
      });
      expect(memberSeat).toBeTruthy();
      expect(memberSeat!.userId).toBeNull(); // Not linked yet

      // Verify email was sent
      expect(mailService.sentMails).toHaveLength(1);
      expect(mailService.sentMails[0].to).toBe(createDto.email);
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
        memberSeatId: testWorkspace.members[0].id,
        type: 'workspace',
      };

      await request(app.getHttpServer())
        .post(`/invitations/workspace/${testWorkspace.slug}`)
        .set('Authorization', `Bearer ${testUserJwt}`)
        .send(createDto)
        .expect(400);
    });

    it('should return 400 when pending invitation already exists', async () => {
      const createDto: CreateWorkspaceInvitationDto = {
        email: 'duplicate@example.com',
        workspaceSlug: testWorkspace.slug,
        memberSeatId: testWorkspace.members[0].id,
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

    it('should return 404 when workspace not found', async () => {
      const createDto: CreateWorkspaceInvitationDto = {
        email: 'test@example.com',
        workspaceSlug: 'non-existent',
        memberSeatId: emptySeat.id,
        type: 'workspace',
      };

      await request(app.getHttpServer())
        .post(`/invitations/workspace/${testWorkspace.slug}`)
        .set('Authorization', `Bearer ${testUserJwt}`)
        .send(createDto)
        .expect(404);
    });

    it('should return 400 when neither email nor inviteeId provided', async () => {
      const createDto: Partial<CreateWorkspaceInvitationDto> = {
        workspaceSlug: testWorkspace.slug,
      };

      await request(app.getHttpServer())
        .post(`/invitations/workspace/${testWorkspace.slug}`)
        .set('Authorization', `Bearer ${testUserJwt}`)
        .send(createDto)
        .expect(400);
    });
  });

  describe('GET /invitations/workspace/:slug', () => {
    beforeEach(async () => {
      // Create some test invitations
      await prismaTesting.client.invitation.createMany({
        data: [
          {
            type: 'WORKSPACE',
            email: 'user1@example.com',
            firstName: 'User',
            lastName: 'One',
            token: uuidv4(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            workspaceId: testWorkspace.id,
            inviterId: testUser.id,
            memberSeatId: (
              await prismaTesting.client.member.create({
                data: {
                  workspace: {
                    connect: {
                      id: testWorkspace.id,
                    },
                  },
                  createdBy: {
                    connect: {
                      id: testUser.id,
                    },
                  },
                  name: 'User One',
                  roles: { set: [WorkspaceRole.STUDENT] },
                },
              })
            ).id,
          },
          {
            type: 'WORKSPACE',
            email: 'user2@example.com',
            firstName: 'User',
            lastName: 'Two',
            token: uuidv4(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            workspaceId: testWorkspace.id,
            inviterId: testUser.id,
            memberSeatId: (
              await prismaTesting.client.member.create({
                data: {
                  workspace: {
                    connect: {
                      id: testWorkspace.id,
                    },
                  },
                  createdBy: {
                    connect: {
                      id: testUser.id,
                    },
                  },
                  name: 'User Two',
                  roles: { set: [WorkspaceRole.STUDENT] },
                },
              })
            ).id,
          },
        ],
      });
    });

    it('should return all invitations for a workspace', async () => {
      const response = await request(app.getHttpServer())
        .get('/invitations/workspace/test-workspace')
        //.set('Authorization', `Bearer ${testUserJwt}`)
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toEqual(
        expect.objectContaining({
          email: 'user1@example.com',
          workspaceId: testWorkspace.id,
        }),
      );
      expect(response.body[1]).toEqual(
        expect.objectContaining({
          email: 'user2@example.com',
          workspaceId: testWorkspace.id,
        }),
      );
    });

    it('should return 404 when workspace not found', async () => {
      await request(app.getHttpServer())
        .get('/invitations/workspace/non-existent')
        .expect(404);
    });
  });

  describe('GET /invitations/token/:token', () => {
    let testInvitation: any;
    const invitationToken = uuidv4();
    beforeEach(async () => {
      const memberSeat = await prismaTesting.client.member.create({
        data: {
          workspace: {
            connect: {
              id: testWorkspace.id,
            },
          },
          name: 'Test User',
          roles: { set: [WorkspaceRole.STUDENT] },
          createdBy: {
            connect: {
              id: testUser.id,
            },
          },
        },
      });

      testInvitation = await prismaTesting.client.invitation.create({
        data: {
          type: 'WORKSPACE',
          email: 'test@example.com',
          token: 'invitationToken',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          workspaceId: testWorkspace.id,
          inviterId: testUser.id,
          memberSeatId: memberSeat.id,
        },
      });
    });

    it('should return invitation details by token', async () => {
      const response = await request(app.getHttpServer())
        .get('/invitations/token/' + invitationToken)
        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          id: testInvitation.id,
          token: invitationToken,
          email: 'test@example.com',
        }),
      );
    });

    it('should return 404 when token not found', async () => {
      await request(app.getHttpServer())
        .get('/invitations/token/' + uuidv4())
        .expect(404);
    });
  });

  describe('POST /invitations/accept/:token', () => {
    let testInvitation: any;
    let memberSeat: Member;
    const invitationToken = uuidv4();
    beforeEach(async () => {
      memberSeat = await prismaTesting.client.member.create({
        data: {
          workspace: {
            connect: {
              id: testWorkspace.id,
            },
          },
          name: 'Test User',
          roles: { set: [WorkspaceRole.STUDENT] },
          createdBy: {
            connect: {
              id: testUser.id,
            },
          },
        },
      });

      testInvitation = await prismaTesting.client.invitation.create({
        data: {
          type: 'WORKSPACE',
          email: testUser.accounts[0].email, // Same as testUser's email
          token: invitationToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          workspaceId: testWorkspace.id,
          inviterId: testUser.id,
          memberSeatId: memberSeat.id,
        },
      });
    });

    it('should accept an invitation successfully', async () => {
      const response = await request(app.getHttpServer())
        .post(`/invitations/accept/${invitationToken}`)
        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          id: testInvitation.id,
          status: InvitationStatus.ACCEPTED,
          inviteeId: testUser.id,
        }),
      );

      // Verify member was linked to user
      const updatedMember = await prismaTesting.client.member.findUnique({
        where: { id: memberSeat.id },
      });
      expect(updatedMember!.userId).toBe(testUser.id);

      // Verify invitation status in database
      const updatedInvitation =
        await prismaTesting.client.invitation.findUnique({
          where: { id: testInvitation.id },
        });
      expect(updatedInvitation!.status).toBe(InvitationStatus.ACCEPTED);
    });

    it('should return 404 when token not found', async () => {
      await request(app.getHttpServer())
        .post('/invitations/accept/' + uuidv4())
        .expect(404);
    });

    it('should return 400 when invitation is expired', async () => {
      // Create expired invitation
      const expiredToken = uuidv4();
      await prismaTesting.client.invitation.create({
        data: {
          type: 'WORKSPACE',
          email: 'john@example.com',
          token: expiredToken,
          expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
          workspace: {
            connect: {
              id: testWorkspace.id,
            },
          },
          inviter: {
            connect: {
              id: testUser.id,
            },
          },
          memberSeat: {
            connect: {
              id: memberSeat.id,
            },
          },
        },
      });

      await request(app.getHttpServer())
        .post('/invitations/accept/' + expiredToken)
        .expect(400); // TODO: check response message (could fail with 400 for manny reason)
    });
  });

  describe('POST /invitations/decline/:token', () => {
    let testInvitation: any;
    const invitationToken = uuidv4();
    beforeEach(async () => {
      const memberSeat = await prismaTesting.client.member.create({
        data: {
          workspace: {
            connect: {
              id: testWorkspace.id,
            },
          },
          createdBy: {
            connect: {
              id: testUser.id,
            },
          },
          name: 'Test User',
          roles: { set: [WorkspaceRole.STUDENT] },
        },
      });

      testInvitation = await prismaTesting.client.invitation.create({
        data: {
          type: 'WORKSPACE',
          email: testUser.accounts[0].email,
          token: invitationToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          workspaceId: testWorkspace.id,
          inviterId: testUser.id,
          memberSeatId: memberSeat.id,
        },
      });
    });

    it('should decline an invitation successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/invitations/decline/' + invitationToken)
        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          id: testInvitation.id,
          status: InvitationStatus.DECLINED,
          inviteeId: testUser.id,
        }),
      );

      // Verify invitation status in database
      const updatedInvitation =
        await prismaTesting.client.invitation.findUnique({
          where: { id: testInvitation.id },
        });
      expect(updatedInvitation!.status).toBe(InvitationStatus.DECLINED);
    });

    it('should return 404 when token not found', async () => {
      await request(app.getHttpServer())
        .post('/invitations/decline/' + uuidv4())
        .expect(404);
    });

    it('should return 400 when invitation is already declined', async () => {
      // First decline
      const token = uuidv4();
      await request(app.getHttpServer())
        .post('/invitations/decline/' + token)
        .expect(200);

      // Try to decline again
      await request(app.getHttpServer())
        .post('/invitations/decline/' + token)
        .expect(400);
    });
  });

  describe('End-to-End Workflow', () => {
    it('should complete full invitation workflow', async () => {
      // 1. Create invitation
      const createDto: CreateWorkspaceInvitationDto = {
        email: 'workflow@example.com',
        workspaceSlug: 'test-workspace',
        memberSeatId: otherUser.id,
        type: 'workspace',
      };

      const createResponse = await request(app.getHttpServer())
        .post('/invitations/workspace/test-workspace')
        .send(createDto)
        .expect(201);

      const invitationToken = createResponse.body.token;

      // 2. Get invitation by token (as if user clicked link)
      const getResponse = await request(app.getHttpServer())
        .get(`/invitations/token/${invitationToken}`)
        .expect(200);

      expect(getResponse.body.status).toBe(InvitationStatus.PENDING);

      // 3. Create a new user account that matches the invitation email
      const newUser = await prismaTesting.client.user.create({
        data: {
          firstName: 'Workflow',
          lastName: 'User',
          accounts: {
            create: {
              provider: 'LOCAL',
              email: 'workflow@example.com',
              password: 'hashedpassword',
              isEmailVerified: true,
            },
          },
        },
        include: {
          accounts: true,
        },
      });

      // Update request.user to the new user
      app.use((req, res, next) => {
        req.user = newUser;
        next();
      });

      // 4. Accept invitation
      const acceptResponse = await request(app.getHttpServer())
        .post(`/invitations/accept/${invitationToken}`)
        .expect(200);

      expect(acceptResponse.body.status).toBe(InvitationStatus.ACCEPTED);
      expect(acceptResponse.body.inviteeId).toBe(newUser.id);

      // 5. Verify user is now a member
      const member = await prismaTesting.client.member.findUnique({
        where: { id: acceptResponse.body.memberSeatId },
      });
      expect(member!.userId).toBe(newUser.id);

      // 6. Verify invitation appears in workspace invitations list
      const listResponse = await request(app.getHttpServer())
        .get('/invitations/workspace/test-workspace')
        .expect(200);

      const acceptedInvitation = listResponse.body.find(
        (inv: any) => inv.id === createResponse.body.id,
      );
      expect(acceptedInvitation.status).toBe(InvitationStatus.ACCEPTED);
    });
  });
});
