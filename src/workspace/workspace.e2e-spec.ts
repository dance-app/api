import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
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

  let ownerAccessToken: string;
  let workspaceId: number;
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

    expect(createResponse.body).toEqual(
      expect.objectContaining({
        id: expect.any(Number),
        name: 'My First Studio',
        slug: slugBase,
        configuration: expect.any(Object),
      }),
    );

    workspaceId = createResponse.body.id;
    workspaceSlug = createResponse.body.slug;

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
      createdAt: new Date(createResponse.body.createdAt),
      updatedAt: new Date(createResponse.body.updatedAt),
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
        message: 'User updated',
        data: expect.objectContaining({
          id: workspaceId,
          name: 'Renamed Studio',
          slug: workspaceSlug,
        }),
      }),
    );

    const deleteResponse = await request(app.getHttpServer())
      .delete(`/workspaces/${workspaceSlug}`)
      .auth(ownerAccessToken, { type: 'bearer' })
      .expect(200);

    expect(deleteResponse.body).toEqual(
      expect.objectContaining({
        message: 'Workspace deleted',
        data: expect.objectContaining({
          id: workspaceId,
          slug: null,
          deletedAt: expect.any(String),
        }),
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
});
