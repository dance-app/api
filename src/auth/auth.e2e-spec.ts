import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';

import { AppModule } from '../app.module';

import {
  expectAccountShape,
  expectUserShapeWithoutToken,
  expectUserShapeWithToken,
} from '@/test/assertions';

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
    await prisma.account.deleteMany();
    await prisma.user.deleteMany();
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
      .then(({ body }) => {
        expectUserShapeWithoutToken(body, dto);
        expectAccountShape(body.accounts[0], body.id, dto);
      });
  });

  it('sign-in 200 & returns JWT', () => {
    return request(app.getHttpServer())
      .post('/auth/sign-in')
      .send({ email: dto.email, password: dto.password })
      .expect(200)
      .then((res) => {
        expect(res.body.token).toBeDefined();
        expect.objectContaining({
          token: expect.any(String),
        });
      });
  });

  it('fails on wrong password', () => {
    return request(app.getHttpServer())
      .post('/auth/sign-in')
      .send({ email: dto.email, password: 'wrong' })
      .expect(403);
  });

  it('get-me 200 returns current user', async () => {
    const { body: signInBody } = await request(app.getHttpServer())
      .post('/auth/sign-in')
      .send({ email: dto.email, password: dto.password })
      .expect(200);

    const token = signInBody.token as string;

    return request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .then(({ body }) => {
        console.log('body', body);
        expectUserShapeWithToken(body, dto);
        expectAccountShape(body.accounts[0], body.id, dto);
      });
  });
});
