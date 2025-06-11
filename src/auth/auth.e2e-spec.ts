import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { JwtModule } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { v4 as uuid } from 'uuid';

import { AuthModule } from './auth.module';
import { SignInResponseDto } from './dto';

import { DatabaseModule } from '@/database/database.module';
import { MailService } from '@/mail/mail.service';
import { PaginationModule } from '@/pagination/pagination.module';
/*import {
  expectAccountShape,
  expectUserShapeWithoutToken,
  expectUserShapeWithToken,
} from '@/test/helpers/assertions';*/ // TODO
import { PrismaTestingService } from '@/test/helpers/prisma-testing.service';
import { MockMailService } from '@/test/mock-services/mock-mail.service';

describe('Auth flow', () => {
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

  afterAll(async () => {
    await prismaTesting.close();
    await app.close();
  });

  const dto = {
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@test.dev',
    password: 'P@ssw0rd!',
  };

  describe('POST /auth/sign-up', () => {
    beforeEach(async () => {
      await prismaTesting.reset();
      mailService.reset();
    });

    it('should create a new user successfully', () => {
      return request(app.getHttpServer())
        .post('/auth/sign-up')
        .send(dto)
        .expect(201)
        .expect((res) => {
          // TODO: write equivalent of expectUserShapeWithoutToken
          expect(res.body.accessToken).toBeDefined();
          expect(res.body.refreshToken).toBeDefined();
          expect(mailService.sentMails.length).toBe(1);
          expect(mailService.sentMails[0].to).toBe(dto.email);
          expect(mailService.sentMails[0].subject).toContain(
            'Verify your email',
          );
        });
    });

    it('should return 409 if email is already in use', async () => {
      // Setup: Create a user first
      await request(app.getHttpServer())
        .post('/auth/sign-up')
        .send(dto)
        .expect(201);

      // Then try to create another user with the same email
      return request(app.getHttpServer())
        .post('/auth/sign-up')
        .send(dto)
        .expect(409)
        .expect((res) => {
          expect(res.body.message).toContain('Email already in use');
        });
    });

    it('should return 400 for invalid email format', () => {
      const invalidUser = { ...dto, email: 'invalid-email' };
      return request(app.getHttpServer())
        .post('/auth/sign-up')
        .send(invalidUser)
        .expect(400)
        .expect((res) => {
          expect(res.body.message[0]).toContain('email');
        });
    });

    it('should return 400 for weak password', () => {
      const weakPasswordUser = { ...dto, password: 'weak' };
      return request(app.getHttpServer())
        .post('/auth/sign-up')
        .send(weakPasswordUser)
        .expect(400)
        .expect((res) => {
          expect(res.body.message[0]).toContain('password');
        });
    });
  });

  describe('POST /auth/sign-in', () => {
    beforeEach(async () => {
      await prismaTesting.reset();
      mailService.reset();

      // Create a test user before each test
      await request(app.getHttpServer()).post('/auth/sign-up').send(dto);

      // Simulate email verification for the user
      await prismaTesting.verifyEmail(dto.email);
    });

    it('should authenticate a user with valid credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/sign-in')
        .send({
          email: dto.email,
          password: dto.password,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.accessToken).toBeDefined();
          expect(res.body.refreshToken).toBeDefined();
        });
    });

    it('should return 401 with invalid credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/sign-in')
        .send({
          email: dto.email,
          password: 'wrongpassword',
        })
        .expect(401);
    });

    it('should return 401 if email is not verified', async () => {
      // Create a new user without verifying email
      const unverifiedUser = {
        email: 'unverified@example.com',
        password: 'StrongP@ssw0rd',
        firstName: 'Unverified',
        lastName: 'User',
      };

      await request(app.getHttpServer())
        .post('/auth/sign-up')
        .send(unverifiedUser);

      // Try to sign in
      return request(app.getHttpServer())
        .post('/auth/sign-in')
        .send({
          email: unverifiedUser.email,
          password: unverifiedUser.password,
        })
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toContain('Email not verified');
        });
    });
  });

  describe('POST /auth/refresh-token', () => {
    let refreshToken: string;

    beforeEach(async () => {
      await prismaTesting.reset();
      mailService.reset();

      // Create a test user
      await request(app.getHttpServer()).post('/auth/sign-up').send(dto);

      // Verify email
      await prismaTesting.verifyEmail(dto.email);

      // Sign in to get a refresh token
      const response = await request(app.getHttpServer())
        .post('/auth/sign-in')
        .send({
          email: dto.email,
          password: dto.password,
        });

      refreshToken = response.body.refreshToken;
    });

    it('should issue a new access token with valid refresh token', async () => {
      return await request(app.getHttpServer())
        .post('/auth/refresh-token')
        .send({ refreshToken })
        .expect(200)
        .expect((res) => {
          expect(res.body.accessToken).toBeDefined();
        });
    });

    it('should return 401 with invalid refresh token', async () => {
      return await request(app.getHttpServer())
        .post('/auth/refresh-token')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);
    });
  });

  describe('POST /auth/forgot-password', () => {
    beforeEach(async () => {
      await prismaTesting.reset();
      // Create a test user
      await request(app.getHttpServer()).post('/auth/sign-up').send(dto);

      // Verify email
      await prismaTesting.verifyEmail(dto.email);

      mailService.reset();
    });

    it('should send a password reset email for existing user', async () => {
      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: dto.email })
        .expect(200)
        .expect((res) => {
          expect(res.body.message).toContain(
            'If an account with that email exists',
          );
          expect(mailService.sentMails.length).toBe(1);
          expect(mailService.sentMails[0].to).toBe(dto.email);
          expect(mailService.sentMails[0].subject).toContain(
            'Reset Your Password',
          );
        });
    });

    it('should not reveal if an email exists in the system', async () => {
      return await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' })
        .expect(200)
        .expect((res) => {
          expect(res.body.message).toContain(
            'If an account with that email exists',
          );
          expect(mailService.sentMails.length).toBe(0); // No email sent for non-existent account
        });
    });
  });

  describe('POST /auth/reset-password', () => {
    let resetToken: string;

    beforeEach(async () => {
      await prismaTesting.reset();
      mailService.reset();

      // Create a test user
      await request(app.getHttpServer()).post('/auth/sign-up').send(dto);
      // Verify email
      await prismaTesting.verifyEmail(dto.email);

      // Request password reset
      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: dto.email });

      // Get the reset token from the mock service
      resetToken = await prismaTesting.getResetToken(dto.email);
    });

    it('should reset password with valid token', async () => {
      // Reset the password
      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token: resetToken,
          password: 'NewStrongP@ssw0rd',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.message).toContain(
            'Password has been reset successfully',
          );
        });

      // Try to sign in with the new password
      return request(app.getHttpServer())
        .post('/auth/sign-in')
        .send({
          email: dto.email,
          password: 'NewStrongP@ssw0rd',
        })
        .expect(200);
    });

    it('should return 400 with invalid token', () => {
      return request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token: 'invalid-token',
          password: 'NewStrongP@ssw0rd',
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('token must be a UUID');
        });
    });

    it('should return 400 with invalid uuid token', () => {
      return request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token: uuid(),
          password: 'NewStrongP@ssw0rd',
        })
        .expect(404)
        .expect((res) => {
          expect(res.body.message).toContain('Invalid or expired token');
        });
    });

    it('should return 400 with expired token', async () => {
      // Expire the token in the mock service
      await prismaTesting.expireResetToken(dto.email);

      return request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token: resetToken,
          password: 'NewStrongP@ssw0rd',
        })
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toContain('Invalid or expired token');
        });
    });
  });

  describe('POST /auth/verify-email', () => {
    let verificationToken: string;

    beforeEach(async () => {
      await prismaTesting.reset();
      mailService.reset();

      // Create a test user
      await request(app.getHttpServer()).post('/auth/sign-up').send(dto);

      // Get the verification token from the mock service
      verificationToken = await prismaTesting.getEmailVerificationToken(
        dto.email,
      );
    });

    it('should verify email with valid token', async () => {
      // Verify the email
      await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({ token: verificationToken })
        .expect(200)
        .expect((res) => {
          expect(res.body.message).toContain('Email verified successfully');
        });

      // Try to sign in (should work after email verification)
      return request(app.getHttpServer())
        .post('/auth/sign-in')
        .send({
          email: dto.email,
          password: dto.password,
        })
        .expect(200);
    });

    it('should return 400 with invalid token', () => {
      return request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({ token: 'invalid-token' })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('token must be a UUID');
        });
    });

    it('should return 400 with invalid uuid token', () => {
      return request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({ token: uuid() })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('Invalid or expired token');
        });
    });

    it('should return 400 with expired token', async () => {
      // Expire the token in the mock service
      await prismaTesting.expireEmailVerificationToken(dto.email);

      return request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({ token: verificationToken })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('Invalid or expired token');
        });
    });
  });

  describe('GET /auth/me', () => {
    let accessToken: string;

    beforeEach(async () => {
      await prismaTesting.reset();
      mailService.reset();

      // Create a test user
      await request(app.getHttpServer()).post('/auth/sign-up').send(dto);

      // Verify email
      await prismaTesting.verifyEmail(dto.email);

      // Sign in to get an access token
      const response = await request(app.getHttpServer())
        .post('/auth/sign-in')
        .send({
          email: dto.email,
          password: dto.password,
        });

      accessToken = response.body.accessToken;
    });

    it('should return user profile with valid token', () => {
      return request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBeDefined(); // TODO: in assertions.ts
          /*expect(res.body.accounts).toEqual(
            expect.arrayContaining({
              email: expect.any(Array),
            }),
          )(dto.email);*/
          expect(res.body.firstName).toBe(dto.firstName);
          expect(res.body.lastName).toBe(dto.lastName);
          // Should not return password
          expect(res.body.password).toBeUndefined();
        });
    });

    it('should return 401 without token', () => {
      return request(app.getHttpServer()).get('/auth/me').expect(401);
    });

    it('should return 401 with invalid token', () => {
      return request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('PATCH /auth/change-password', () => {
    let accessToken: string;
    let accountId: number;
    beforeEach(async () => {
      await prismaTesting.reset();
      mailService.reset();

      // Create a test user
      const resp = await request(app.getHttpServer())
        .post('/auth/sign-up')
        .send(dto);
      const signInResponse = resp.body as SignInResponseDto;
      const userWithAccount = signInResponse.user;
      accountId = userWithAccount.id;
      // Verify email
      await prismaTesting.verifyEmail(dto.email);

      // Sign in to get an access token
      const response = await request(app.getHttpServer())
        .post('/auth/sign-in')
        .send({
          email: dto.email,
          password: dto.password,
        });

      accessToken = response.body.accessToken;
    });

    it('should change password with valid credentials', async () => {
      // Change the password
      await request(app.getHttpServer())
        .patch('/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          accountId,
          currentPassword: dto.password,
          newPassword: 'NewStrongP@ssw0rd123',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.message).toContain('Password changed successfully');
        });

      // Try to sign in with the new password
      return request(app.getHttpServer())
        .post('/auth/sign-in')
        .send({
          email: dto.email,
          password: 'NewStrongP@ssw0rd123',
        })
        .expect(200);
    });

    it('should return 401 with incorrect current password', () => {
      return request(app.getHttpServer())
        .patch('/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          accountId: accountId,
          currentPassword: 'WrongPassword',
          newPassword: 'NewStrongP@ssw0rd123',
        })
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toContain('Current password is incorrect');
        });
    });

    it('should return 400 with weak new password', () => {
      return request(app.getHttpServer())
        .patch('/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          accountId: accountId,
          currentPassword: dto.password,
          newPassword: 'weak',
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message[0]).toContain('newPassword');
        });
    });

    it('should return 401 without token', () => {
      return request(app.getHttpServer())
        .patch('/auth/change-password')
        .send({
          accountId: accountId,
          currentPassword: dto.password,
          newPassword: 'NewStrongP@ssw0rd123',
        })
        .expect(401);
    });
  });
  /*it('sign-up 201', () => {
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
      .expect(401);
  });

  it('get-me 200 returns current user', async () => {
    const { body: signInBody } = await request(app.getHttpServer())
      .post('/auth/sign-in')
      .send({ email: dto.email, password: dto.password })
      .expect(200);

    const token = (signInBody as SignInResponseDto).accessToken as string;

    return request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .then(({ body }) => {
        console.log('body', body);
        expectUserShapeWithToken(body, dto);
        expectAccountShape(body.accounts[0], body.id, dto);
      });
  });*/
});
