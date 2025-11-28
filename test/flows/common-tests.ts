import { INestApplication } from '@nestjs/common';
import {
  DanceRole,
  Invitation,
  PrismaClient,
  Workspace,
  WorkspaceRole,
} from '@prisma/client';
import request from 'supertest';

import { MockMailService } from '../mock-mail.service';

import { SUCCESS_MESSAGES } from '@/lib/constants';

export async function signInTest(
  app: INestApplication,
  email: string,
  password: string,
) {
  const response = await request(app.getHttpServer())
    .post('/auth/sign-in')
    .send({
      email,
      password,
    })
    .expect(200)
    .expect((res) => {
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
    });
  return {
    accessToken: response.body.data.accessToken,
    refreshToken: response.body.data.refreshToken,
  };
}

export async function signInWrongPassTest(
  app: INestApplication,
  email: string,
  wrongPassword: string,
) {
  const response = await request(app.getHttpServer())
    .post('/auth/sign-in')
    .send({
      email,
      password: wrongPassword,
    })
    .expect(401)
    .expect(() => undefined);
  return {
    accessToken: response.body?.data?.accessToken,
    refreshToken: response.body?.data?.refreshToken,
  };
}

export async function signUpTest(
  app: INestApplication,
  prisma: PrismaClient,
  mailService: MockMailService,
  email: string,
  firstName: string,
  lastName: string,
  password: string,
) {
  const dto = {
    firstName,
    lastName,
    email,
    password,
  };
  const response = await request(app.getHttpServer())
    .post('/auth/sign-up')
    .send(dto)
    .expect(201)
    .expect((res) => {
      // TODO: write equivalent of expectUserShapeWithoutToken
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      expect(mailService.sentMails.length).toBeGreaterThan(0);
      expect(mailService.sentMails[mailService.sentMails.length - 1].to).toBe(
        dto.email,
      );
      expect(
        mailService.sentMails[mailService.sentMails.length - 1].subject,
      ).toContain('Verify your email');
    });
  const userModel = await prisma.user.findFirst({
    where: {
      accounts: {
        every: {
          email,
        },
      },
    },
    include: {
      accounts: true,
    },
  });
  expect(userModel).toBeDefined();
  expect(userModel.accounts).toHaveLength(1);
  return {
    confirmToken:
      mailService.sentMails[mailService.sentMails.length - 1].context.token,
    accessToken: response.body.data.accessToken,
    refreshToken: response.body.data.refreshToken,
    user: userModel,
  };
}
export async function forgotPasswordTest(
  app: INestApplication,
  mailService: MockMailService,
  email: string,
) {
  await request(app.getHttpServer())
    .post('/auth/forgot-password')
    .send({ email })
    .expect(200)
    .expect((res) => {
      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toBe(
        SUCCESS_MESSAGES.PASSWORD_RESET_EMAIL_SENT,
      );
      expect(mailService.sentMails.length).toBeGreaterThan(0);
      expect(mailService.sentMails[mailService.sentMails.length - 1].to).toBe(
        email,
      );
      expect(
        mailService.sentMails[mailService.sentMails.length - 1].subject,
      ).toContain('Reset Your Password');
    });
  return {
    resetToken:
      mailService.sentMails[mailService.sentMails.length - 1].context.token,
  };
}

export async function resetPasswordTest(
  app: INestApplication,
  token: string,
  newPassword: string,
) {
  await request(app.getHttpServer())
    .post('/auth/reset-password')
    .send({
      token,
      password: newPassword,
    })
    .expect(200)
    .expect((res) => {
      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toBe(
        SUCCESS_MESSAGES.PASSWORD_RESET_SUCCESS,
      );
    });
}
export async function verifyEmailTest(
  app: INestApplication,
  verificationToken: string,
) {
  await request(app.getHttpServer())
    .post('/auth/verify-email')
    .send({ token: verificationToken })
    .expect(200)
    .expect((res) => {
      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toBe(
        SUCCESS_MESSAGES.EMAIL_VERIFIED_SUCCESS,
      );
    });
}

export async function createWorkspaceWithNoOwnerTest(
  app: INestApplication,
  prisma: PrismaClient,
  userJwt: string,
  workspaceName: string,
  workspaceSlug: string,
) {
  await request(app.getHttpServer())
    .post('/workspaces')
    .set('Authorization', 'Bearer ' + userJwt)
    .send({
      name: workspaceName,
      slug: workspaceSlug,
    })
    .expect(201)
    .expect((res) => {
      // TODO: asertion.td Expect workspace
      expect(res.body.id).toBeDefined();
      expect(res.body.slug).toBe(workspaceSlug);
      expect(res.body.name).toBe(workspaceName);
    });
  const workspace = await prisma.workspace.findUnique({
    where: {
      slug: workspaceSlug,
    },
    include: {
      members: true,
      configuration: true,
    },
  });
  expect(workspace).toBeDefined();
  expect(workspace?.name).toBe(workspaceName);
  expect(workspace?.slug).toBe(workspaceSlug);
  expect(workspace?.members.length).toBe(1);

  return {
    workspace,
  };
}
export async function createWorkspaceSeatTest(
  app: INestApplication,
  prisma: PrismaClient,
  userJwt: string,
  workspaceSlug: string,
  role: WorkspaceRole,
) {
  const addMemberPayload = {
    email: 'new.student@example.com',
    memberName: 'New Student',
    roles: [role],
  };
  const response = await request(app.getHttpServer())
    .post(`/workspace/${workspaceSlug}/members`)
    .set('Authorization', `Bearer ${userJwt}`)
    .send(addMemberPayload)
    .expect(201);

  // Assert - Check response
  expect(response.body).toBeDefined();
  expect(response.body.name).toBe(addMemberPayload.memberName);
  expect(response.body.roles).toContain(role);
  expect(response.body.id).toBeDefined();

  // Assert - Check database
  const workspace = await prisma.workspace.findUnique({
    where: {
      slug: workspaceSlug,
    },
  });
  const createdMember = await prisma.member.findFirst({
    where: {
      workspaceId: workspace.id,
      name: addMemberPayload.memberName,
    },
    include: {
      user: true,
    },
  });

  expect(createdMember).toBeDefined();
  expect(createdMember?.name).toBe(addMemberPayload.memberName);
  expect(createdMember?.roles).toContain(role);

  return {
    member: createdMember,
  };
}
export async function sendWorkspaceInviteTest(
  app: INestApplication,
  prisma: PrismaClient,
  mockMailService: MockMailService,
  userJwt: string,
  workspaceSlug: string,
  memberSeatId: string,
  inviteeEmail: string | undefined = undefined,
  inviteeId: string | undefined = undefined,
) {
  // Invitation data
  const invitationData = {
    email: inviteeEmail,
    type: 'workspace',
    memberSeatId: memberSeatId,
    workspaceSlug: workspaceSlug,
    inviteeId: inviteeId,
  };

  // Make request to create invitation
  const response = await request(app.getHttpServer())
    .post('/invitations/workspace/' + workspaceSlug)
    .set('Authorization', `Bearer ${userJwt}`)
    .send(invitationData)
    .expect(201);

  // Verify response structure
  expect(response.body).toHaveProperty('id');
  expect(response.body).toHaveProperty('email', inviteeEmail);
  expect(response.body).toHaveProperty('status', 'PENDING');
  expect(response.body).toHaveProperty('type', 'WORKSPACE');
  expect(response.body).toHaveProperty('workspaceSlug', workspaceSlug);

  const invitationId = response.body.id;

  // Verify database record
  const dbInvitation = await prisma.invitation.findUnique({
    where: { id: invitationId },
    include: {
      memberSeat: true,
    },
  });

  expect(dbInvitation).toBeTruthy();
  expect(dbInvitation.email).toBe(inviteeEmail);
  expect(dbInvitation.status).toBe('PENDING');
  expect(dbInvitation.memberSeatId).toBe(memberSeatId);
  expect(dbInvitation.token).toBeTruthy(); // Token should be generated

  // Verify that the member seat is now reserved
  const memberSeat = await prisma.member.findUnique({
    where: { id: memberSeatId },
  });

  expect(memberSeat.userId).toBeDefined();

  // Verify email was sent
  expect(mockMailService.sentMails.length).toBeGreaterThan(0);
  const sentMail =
    mockMailService.sentMails[mockMailService.sentMails.length - 1];

  expect(sentMail.to).toBe(inviteeEmail);
  expect(sentMail.subject).toBe('Workspace Invitation');
  expect(sentMail.context).toHaveProperty('inviteToken', dbInvitation.token);
  //expect(sentMail.context).toHaveProperty('workspaceName', workspaceName);
  //expect(sentMail.context).toHaveProperty('assignedRole', 'TEACHER');

  return {
    invite: dbInvitation,
  };
}

export async function listWorkspaceInvitesTest(
  app: INestApplication,
  userJwt: string,
  workspace: Workspace,
  expectedInvites: Pick<
    Invitation,
    'email' | 'token' | 'status' | 'inviterId' | 'inviteeId' | 'memberSeatId'
  >[],
) {
  const response = await request(app.getHttpServer())
    .get('/invitations/workspace/' + workspace.slug)
    .set('Authorization', `Bearer ${userJwt}`)
    .expect(200);

  expect(response.body).toHaveLength(expectedInvites.length);
  console.log(expectedInvites);
  for (const [i, invite] of expectedInvites.entries()) {
    console.log(response.body);
    expect(response.body[i]).toEqual(
      expect.objectContaining({
        workspaceId: workspace.id,
        type: 'WORKSPACE',
        ...invite,
      }),
    );
  }
}

export async function listPersonalInvitesTest(
  app: INestApplication,
  userJwt: string,
  workspace: Workspace,
  expectedInvites: Pick<
    Invitation,
    'email' | 'token' | 'status' | 'inviterId' | 'inviteeId' | 'memberSeatId'
  >[],
) {
  const response = await request(app.getHttpServer())
    .get('/invitations')
    .set('Authorization', `Bearer ${userJwt}`)
    .expect(200);

  expect(response.body).toHaveLength(expectedInvites.length);
  for (const [i, invite] of expectedInvites.entries()) {
    expect(response.body[i]).toEqual(
      expect.objectContaining({
        workspaceId: workspace.id,
        type: 'WORKSPACE',
        ...invite,
      }),
    );
  }
}

export async function acceptInvitationTest(
  app: INestApplication,
  prisma: PrismaClient,
  userJwt: string,
  invitationToken: string,
  expectedWorkspaceSlug: string,
  expectedMemberSeatId: string,
) {
  // Make request to accept invitation
  const response = await request(app.getHttpServer())
    .post(`/invitations/accept/${invitationToken}`)
    .set('Authorization', `Bearer ${userJwt}`)
    .expect(200);

  // Verify response structure
  expect(response.body).toHaveProperty('id');
  expect(response.body).toHaveProperty('status', 'ACCEPTED');
  expect(response.body).toHaveProperty('token', invitationToken);
  expect(response.body).toHaveProperty('workspaceSlug', expectedWorkspaceSlug);
  expect(response.body).toHaveProperty('memberSeatId', expectedMemberSeatId);

  const invitationId = response.body.id;

  // Verify database record - invitation should be marked as accepted
  const dbInvitation = await prisma.invitation.findUnique({
    where: { token: invitationToken },
    include: {
      memberSeat: {
        include: {
          user: true,
        },
      },
      workspace: true,
      invitee: true,
    },
  });

  expect(dbInvitation).toBeTruthy();
  expect(dbInvitation.status).toBe('ACCEPTED');
  expect(dbInvitation.id).toBe(invitationId);

  // Verify that the member seat is now properly linked to the user
  const memberSeat = await prisma.member.findUnique({
    where: { id: expectedMemberSeatId },
    include: {
      user: true,
    },
  });

  expect(memberSeat).toBeTruthy();
  expect(memberSeat.userId).toBeDefined();

  // Verify the user is now a member of the workspace
  const workspace = await prisma.workspace.findUnique({
    where: { slug: expectedWorkspaceSlug },
    include: {
      members: {
        include: {
          user: true,
        },
      },
    },
  });

  expect(workspace).toBeTruthy();
  const userMembership = workspace.members.find(
    (member) => member.userId === memberSeat.userId,
  );
  expect(userMembership).toBeTruthy();

  return {
    invitation: dbInvitation,
    memberSeat,
    workspace,
  };
}

export async function getUserWorkspacesTest(
  app: INestApplication,
  userJwt: string,
  expectedWorkspaces: Array<{
    id: string;
    name: string;
    slug: string;
  }>,
) {
  const response = await request(app.getHttpServer())
    .get('/workspaces')
    .set('Authorization', `Bearer ${userJwt}`)
    .expect(200);

  expect(response.body.data).toHaveLength(expectedWorkspaces.length);

  for (let i = 0; i < expectedWorkspaces.length; i++) {
    expect(response.body.data[i]).toEqual(
      expect.objectContaining({
        id: expectedWorkspaces[i].id,
        name: expectedWorkspaces[i].name,
        slug: expectedWorkspaces[i].slug,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      }),
    );
    expect(response.body.data[i]).toEqual(
      expect.not.objectContaining({
        configuration: expect.any(Object),
      }),
    );
  }

  return response.body;
}

export async function getWorkspaceDetailsTest(
  app: INestApplication,
  userJwt: string,
  workspaceSlug: string,
  expectedWorkspace: {
    id: string;
    name: string;
    slug: string;
    createdAt: Date;
    updatedAt: Date;
  },
) {
  const response = await request(app.getHttpServer())
    .get(`/workspaces/${workspaceSlug}`)
    .set('Authorization', `Bearer ${userJwt}`)
    .expect(200);

  expect(response.body).toEqual(
    expect.objectContaining({
      id: expectedWorkspace.id,
      name: expectedWorkspace.name,
      slug: expectedWorkspace.slug,
      createdAt: expectedWorkspace.createdAt.toISOString(),
      updatedAt: expectedWorkspace.updatedAt.toISOString(),
      configuration: expect.any(Object),
    }),
  );

  return response.body;
}

export async function updateWorkspaceTest(
  app: INestApplication,
  prisma: PrismaClient,
  userJwt: string,
  workspaceId: string,
  updateData: {
    name: string;
    slug: string;
  },
  expectedResult: {
    id: string;
    name: string;
    slug: string;
  },
) {
  const workspaceBeforeUpdate = await prisma.workspace.findUnique({
    where: { id: workspaceId },
  });

  expect(workspaceBeforeUpdate).toBeTruthy();

  const response = await request(app.getHttpServer())
    .patch(`/workspaces/${workspaceBeforeUpdate.slug}`)
    .set('Authorization', `Bearer ${userJwt}`)
    .send(updateData)
    .expect(200);

  // Verify response structure
  expect(response.body).toEqual(
    expect.objectContaining({
      id: expectedResult.id,
      name: expectedResult.name,
      slug: expectedResult.slug,
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    }),
  );

  // Verify database was updated
  const dbWorkspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
  });

  expect(dbWorkspace).toBeTruthy();
  expect(dbWorkspace.name).toBe(updateData.name);
  expect(dbWorkspace.slug).toBe(updateData.slug);

  return response.body;
}

export async function deleteWorkspaceTest(
  app: INestApplication,
  prisma: PrismaClient,
  userJwt: string,
  workspaceSlug: string,
) {
  const response = await request(app.getHttpServer())
    .delete(`/workspaces/${workspaceSlug}`)
    .set('Authorization', `Bearer ${userJwt}`)
    .expect(200);

  expect(response.body).toEqual(
    expect.objectContaining({
      message: 'Workspace deleted',
      data: expect.objectContaining({
        id: expect.any(Number),
        slug: null,
        deletedAt: expect.any(String),
      }),
    }),
  );

  const dbWorkspace = await prisma.workspace.findUnique({
    where: { id: response.body.data.id },
  });

  expect(dbWorkspace).toBeTruthy();
  expect(dbWorkspace?.slug).toBeNull();
  expect(dbWorkspace?.deletedAt).toBeInstanceOf(Date);

  return response.body;
}

export async function getMemberProfileTest(
  app: INestApplication,
  userJwt: string,
  workspaceSlug: string,
  memberId: string,
  expectedMember: {
    id: string;
    name: string;
    roles: WorkspaceRole[];
    userId: string;
    workspaceId: string;
    level?: number | null;
    preferedDanceRole?: DanceRole | null;
  },
) {
  const response = await request(app.getHttpServer())
    .get(`/workspace/${workspaceSlug}/members/${memberId}`)
    .set('Authorization', `Bearer ${userJwt}`)
    .expect(200);

  // Verify member profile structure
  expect(response.body).toEqual(
    expect.objectContaining({
      id: expectedMember.id,
      name: expectedMember.name,
      roles: expect.arrayContaining(expectedMember.roles),
      userId: expectedMember.userId,
      workspaceId: expectedMember.workspaceId,
      level: expectedMember.level,
      preferedDanceRole: expectedMember.preferedDanceRole,
    }),
  );

  return response.body;
}
