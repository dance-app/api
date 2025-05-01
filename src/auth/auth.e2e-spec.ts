import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';

import { AppModule } from '../app.module';

describe('Auth flow', () => {
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
    await prisma.$executeRawUnsafe(
      `TRUNCATE "Account","User" RESTART IDENTITY CASCADE;`,
    );
    await prisma.$disconnect();
    await app.close();
  });

  const dto = {
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@test.dev',
    password: 'P@ssw0rd!',
  };

  it('sign-up 201', () => {
    return request(app.getHttpServer())
      .post('/auth/sign-up')
      .send(dto)
      .expect(201)
      .then((res) => {
        expect(res.body.data.email).toBe(dto.email);
        expect(res.body.data).not.toHaveProperty('token'); // token is set later
      });
  });

  it('sign-in 200 & returns JWT', () => {
    return request(app.getHttpServer())
      .post('/auth/sign-in')
      .send({ email: dto.email, password: dto.password })
      .expect(200)
      .then((res) => {
        expect(res.body.data.token).toBeDefined();
      });
  });

  it('fails on wrong password', () => {
    return request(app.getHttpServer())
      .post('/auth/sign-in')
      .send({ email: dto.email, password: 'wrong' })
      .expect(403);
  });
});
