import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient, Workspace } from '@prisma/client';
import request from 'supertest';

import { AppModule } from '../app.module';

describe.skip('Workspace CRUD', () => {
  let app: INestApplication;
  const prisma = new PrismaClient();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });

  afterAll(async () => {
    await prisma.workspace.deleteMany();
    await prisma.$disconnect();
    await app.close();
  });

  const dto: Omit<Workspace, 'id'> = {
    name: 'Test Workspace',
    slug: 'test-workspace',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('create 201', () => {
    return request(app.getHttpServer())
      .post('/workspace')
      .send(dto)
      .expect(201)
      .then(({ body }) => {
        // TBD: add assertions for workspace creation
        console.log(body);
        expect(body).toEqual({});
      });
  });

  it('read all 200', () => {
    return request(app.getHttpServer())
      .get('/workspaces')
      .send()
      .expect(200)
      .then((res) => {
        expect(res.body).toEqual({});
      });
  });

  it('read workspace by id', () => {
    return request(app.getHttpServer()).get('/workspaces/1').send().expect(200);
  });
});
