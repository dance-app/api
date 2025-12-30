import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { WeekStart } from '@prisma/client';
import request from 'supertest';

import {
  getUserWorkspacesTest,
  getWorkspaceDetailsTest,
  signInTest,
} from '../../test/flows/common-tests';
import { MockMailService } from '../../test/mock-mail.service';
import { AppModule } from '../app.module';

import { MailService } from '@/mail/mail.service';
import { PrismaTestingService } from '@/test/prisma-testing.service';

describe('Workspace CRUD (e2e)', () => {
  let app: INestApplication;
  let moduleFixture: TestingModule;
  const prismaTesting = new PrismaTestingService();
  let mailService: MockMailService;

  const ownerCredentials = {
    email: 'workspace.owner@example.com',
    password: 'WorkspacePwd123!',
    firstName: 'Workspace',
    lastName: 'Owner',
  };

  const regularUserCredentials = {
    email: 'regular.user@example.com',
    password: 'RegularUser123!',
    firstName: 'Regular',
    lastName: 'User',
  };

  let ownerAccessToken: string;
  let regularUserToken: string;
  let workspaceId: string;
  let workspaceSlug: string;

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
  });

  afterAll(async () => {
    await prismaTesting.close();
    await app.close();
    await moduleFixture.close();
  });

  it('performs workspace CRUD and clears slug on delete', async () => {
    await prismaTesting.reset();
    mailService.reset();

    await prismaTesting.createUser(
      ownerCredentials.email,
      ownerCredentials.password,
      ownerCredentials.firstName,
      ownerCredentials.lastName,
      true,
    );

    const signIn = await signInTest(
      app,
      ownerCredentials.email,
      ownerCredentials.password,
    );
    ownerAccessToken = signIn.accessToken;
    expect(ownerAccessToken).toBeTruthy();

    const slugBase = `studio-${Date.now()}`;

    const createResponse = await request(app.getHttpServer())
      .post('/workspaces')
      .auth(ownerAccessToken, { type: 'bearer' })
      .send({
        name: 'My First Studio',
        slug: slugBase,
      })
      .expect(201);

    expect(createResponse.body.data).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        name: 'My First Studio',
        slug: slugBase,
        configuration: expect.objectContaining({
          id: expect.any(String),
          weekStart: expect.any(String),
        }),
      }),
    );

    workspaceId = createResponse.body.data.id;
    workspaceSlug = createResponse.body.data.slug;

    await getUserWorkspacesTest(app, ownerAccessToken, [
      {
        id: workspaceId,
        name: 'My First Studio',
        slug: workspaceSlug,
      },
    ]);

    await getWorkspaceDetailsTest(app, ownerAccessToken, workspaceSlug, {
      id: workspaceId,
      name: 'My First Studio',
      slug: workspaceSlug,
      createdAt: new Date(createResponse.body.data.createdAt),
      updatedAt: new Date(createResponse.body.data.updatedAt),
    });

    const updateResponse = await request(app.getHttpServer())
      .patch(`/workspaces/${workspaceSlug}`)
      .auth(ownerAccessToken, { type: 'bearer' })
      .send({
        name: 'Renamed Studio',
        slug: workspaceSlug,
      })
      .expect(200);

    expect(updateResponse.body).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          id: workspaceId,
          name: 'Renamed Studio',
          slug: workspaceSlug,
        }),
        error: null,
      }),
    );

    // Configuration should NOT be included in update response
    expect(updateResponse.body.data).not.toHaveProperty('configuration');

    const deleteResponse = await request(app.getHttpServer())
      .delete(`/workspaces/${workspaceSlug}`)
      .auth(ownerAccessToken, { type: 'bearer' })
      .expect(200);

    expect(deleteResponse.body).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          id: workspaceId,
          slug: null,
          deletedAt: expect.any(String),
        }),
        error: null,
      }),
    );

    const dbWorkspace = await prismaTesting.client.workspace.findUnique({
      where: { id: workspaceId },
    });

    expect(dbWorkspace).toBeTruthy();
    expect(dbWorkspace?.slug).toBeNull();
    expect(dbWorkspace?.deletedAt).toBeInstanceOf(Date);

    await request(app.getHttpServer())
      .get(`/workspaces/${workspaceSlug}`)
      .auth(ownerAccessToken, { type: 'bearer' })
      .expect(404);
  });

  it('allows owner to update workspace configuration', async () => {
    await prismaTesting.reset();
    mailService.reset();

    // Create owner user
    await prismaTesting.createUser(
      ownerCredentials.email,
      ownerCredentials.password,
      ownerCredentials.firstName,
      ownerCredentials.lastName,
      true,
    );

    const signIn = await signInTest(
      app,
      ownerCredentials.email,
      ownerCredentials.password,
    );
    ownerAccessToken = signIn.accessToken;

    const slugBase = `studio-${Date.now()}`;

    // Create workspace with default configuration
    const createResponse = await request(app.getHttpServer())
      .post('/workspaces')
      .auth(ownerAccessToken, { type: 'bearer' })
      .send({
        name: 'Config Test Studio',
        slug: slugBase,
      })
      .expect(201);

    workspaceSlug = createResponse.body.data.slug;

    // Verify default configuration is MONDAY
    expect(createResponse.body.data.configuration.weekStart).toBe('MONDAY');

    // Update configuration to SUNDAY
    const updateConfigResponse = await request(app.getHttpServer())
      .patch(`/workspaces/${workspaceSlug}/configuration`)
      .auth(ownerAccessToken, { type: 'bearer' })
      .send({
        weekStart: WeekStart.SUNDAY,
      })
      .expect(200);

    expect(updateConfigResponse.body).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          id: expect.any(String),
          weekStart: WeekStart.SUNDAY,
        }),
        error: null,
      }),
    );

    // Verify configuration was updated
    const getResponse = await request(app.getHttpServer())
      .get(`/workspaces/${workspaceSlug}`)
      .auth(ownerAccessToken, { type: 'bearer' })
      .expect(200);

    expect(getResponse.body.data.configuration.weekStart).toBe(
      WeekStart.SUNDAY,
    );
  });

  it('prevents non-owner from updating workspace configuration', async () => {
    await prismaTesting.reset();
    mailService.reset();

    // Create owner user
    await prismaTesting.createUser(
      ownerCredentials.email,
      ownerCredentials.password,
      ownerCredentials.firstName,
      ownerCredentials.lastName,
      true,
    );

    const ownerSignIn = await signInTest(
      app,
      ownerCredentials.email,
      ownerCredentials.password,
    );
    ownerAccessToken = ownerSignIn.accessToken;

    // Create regular user
    await prismaTesting.createUser(
      regularUserCredentials.email,
      regularUserCredentials.password,
      regularUserCredentials.firstName,
      regularUserCredentials.lastName,
      true,
    );

    const regularSignIn = await signInTest(
      app,
      regularUserCredentials.email,
      regularUserCredentials.password,
    );
    regularUserToken = regularSignIn.accessToken;

    const slugBase = `studio-${Date.now()}`;

    // Create workspace as owner
    const createResponse = await request(app.getHttpServer())
      .post('/workspaces')
      .auth(ownerAccessToken, { type: 'bearer' })
      .send({
        name: 'Access Control Studio',
        slug: slugBase,
      })
      .expect(201);

    workspaceSlug = createResponse.body.data.slug;

    // Attempt to update configuration as non-member (should fail)
    await request(app.getHttpServer())
      .patch(`/workspaces/${workspaceSlug}/configuration`)
      .auth(regularUserToken, { type: 'bearer' })
      .send({
        weekStart: 'SATURDAY',
      })
      .expect(403);
  });
});
