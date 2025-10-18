// 1. User signs up
// 2. User verifies its email
// 3. User succesfully signs in
// 4. User tries wrong password
// 5. User request a password reset & receives a reset link by email
// 6. User resets a new password using the token received by email
// 7. User tries to login with old password & fails
// 8. User logs in with new password & succeeds

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import {
  forgotPasswordTest,
  resetPasswordTest,
  signInTest,
  signInWrongPassTest,
  signUpTest,
  verifyEmailTest,
} from './common-tests';
import { setupTestSteps } from './run-flow';
import { AppModule } from '../../src/app.module';
import { MockMailService } from '../mock-mail.service';
import { PrismaTestingService } from '../prisma-testing.service';

import { MailService } from '@/mail/mail.service';
import { UserWithAccount } from '@/user/user.types';

const mockData = {
  user: {
    email: 'user@example.com',
    password: 'password123',
    firstName: 'User',
    lastName: 'Name',
  },
  wrongPassword: 'wrongPassword',
  newPassword: 'newPassword123',
};
type FlowContext = {
  superAdmin?: UserWithAccount | null;
  resetToken?: string | null;
  userJwt?: string | null;
  confirmEmailToken?: string | null;
};

describe.skip('User Forgot Password Flow', () => {
  let app: INestApplication;
  const prismaTesting = new PrismaTestingService();
  let mailService: MockMailService;

  const testState: FlowContext = {
    resetToken: null,
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(MailService)
      .useClass(MockMailService)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    mailService = moduleFixture.get<MockMailService>(MailService);

    await prismaTesting.reset();

    testState.superAdmin = await prismaTesting.createSuperAdmin(
      'admin@example.com',
      'password123',
      'Super',
      'Admin',
    );
  });

  afterAll(async () => {
    await app.close();
  });

  const testSteps = [
    {
      name: 'User signs up',
      test: async () => {
        const tokens = await signUpTest(
          app,
          prismaTesting.client,
          mailService,
          mockData.user.email,
          mockData.user.firstName,
          mockData.user.lastName,
          mockData.user.password,
        );
        testState.confirmEmailToken = tokens.confirmToken;
      },
    },
    {
      name: 'User verifies its email',
      test: async () => {
        await verifyEmailTest(app, testState.confirmEmailToken);
      },
    },
    {
      name: 'User succesfully signs in',
      test: async () => {
        const tokens = await signInTest(
          app,
          mockData.user.email,
          mockData.user.password,
        );
        testState.userJwt = tokens.accessToken;
      },
    },
    {
      name: 'User tries wrong password',
      test: async () => {
        await signInWrongPassTest(
          app,
          mockData.user.email,
          mockData.wrongPassword,
        );
      },
    },
    {
      name: 'User request password reset',
      test: async () => {
        const { resetToken } = await forgotPasswordTest(
          app,
          mailService,
          mockData.user.email,
        );
        testState.resetToken = resetToken;
      },
    },
    {
      name: 'User resets password using token',
      test: async () => {
        await resetPasswordTest(
          app,
          testState.resetToken,
          mockData.newPassword,
        );
      },
    },
    {
      name: 'User fails to login with previous password',
      test: async () => {
        await signInWrongPassTest(
          app,
          mockData.user.email,
          mockData.user.password,
        );
      },
    },
    {
      name: 'User logs in with new password',
      test: async () => {
        await signInTest(app, mockData.user.email, mockData.newPassword);
      },
    },
  ];

  setupTestSteps(testSteps);
});
