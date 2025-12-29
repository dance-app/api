import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { signInTest } from '../../test/flows/common-tests';
import { MockMailService } from '../../test/mock-mail.service';
import { AppModule } from '../app.module';

import { ID_PREFIXES } from '@/lib/id-generator';
import { MailService } from '@/mail/mail.service';
import { PrismaTestingService } from '@/test/prisma-testing.service';

describe('User CRUD (e2e) - Super Admin Only', () => {
  let app: INestApplication;
  let moduleFixture: TestingModule;
  const prismaTesting = new PrismaTestingService();
  let mailService: MockMailService;

  const superAdminCredentials = {
    email: 'super.admin@example.com',
    password: 'SuperAdmin123!',
    firstName: 'Super',
    lastName: 'Admin',
  };

  const regularUserCredentials = {
    email: 'regular.user@example.com',
    password: 'RegularUser123!',
    firstName: 'Regular',
    lastName: 'User',
  };

  let superAdminToken: string;
  let superAdminId: string;
  let regularUserToken: string;
  let regularUserId: string;

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

  beforeEach(async () => {
    await prismaTesting.reset();
    mailService.reset();

    // Create super admin user
    const superAdmin = await prismaTesting.createUser(
      superAdminCredentials.email,
      superAdminCredentials.password,
      superAdminCredentials.firstName,
      superAdminCredentials.lastName,
      true, // isEmailVerified
      true, // isSuperAdmin
    );
    superAdminId = superAdmin.id;

    const superAdminSignIn = await signInTest(
      app,
      superAdminCredentials.email,
      superAdminCredentials.password,
    );
    superAdminToken = superAdminSignIn.accessToken;

    // Create regular user
    const regularUser = await prismaTesting.createUser(
      regularUserCredentials.email,
      regularUserCredentials.password,
      regularUserCredentials.firstName,
      regularUserCredentials.lastName,
      true, // isEmailVerified
      false, // isSuperAdmin
    );
    regularUserId = regularUser.id;

    const regularUserSignIn = await signInTest(
      app,
      regularUserCredentials.email,
      regularUserCredentials.password,
    );
    regularUserToken = regularUserSignIn.accessToken;
  });

  describe('GET /users', () => {
    it('should return all users for super admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/users')
        .auth(superAdminToken, { type: 'bearer' })
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.data).toBeInstanceOf(Array);
      expect(response.body.data.data.length).toBeGreaterThanOrEqual(2);

      // Verify metadata structure
      expect(response.body.data.meta).toBeDefined();
      expect(response.body.data.meta).toHaveProperty('totalCount');
      expect(response.body.data.meta).toHaveProperty('limit');
      expect(response.body.data.meta).toHaveProperty('offset');
      expect(response.body.data.meta.totalCount).toBeGreaterThanOrEqual(2);

      // Verify user structure
      const user = response.body.data.data[0];
      expect(user).toHaveProperty('id');
      expect(user.id.startsWith(ID_PREFIXES.USER)).toBe(true);
      expect(user).toHaveProperty('firstName');
      expect(user).toHaveProperty('lastName');
      expect(user).toHaveProperty('isSuperAdmin');
      expect(user).not.toHaveProperty('password');
      expect(user).not.toHaveProperty('token');
    });

    it('should return 404 for regular users (route hidden)', async () => {
      await request(app.getHttpServer())
        .get('/users')
        .auth(regularUserToken, { type: 'bearer' })
        .expect(404); // SuperAdminGuard returns 404 to hide the route
    });

    it('should return 401 when not authenticated', async () => {
      await request(app.getHttpServer()).get('/users').expect(401);
    });

    it('should support pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/users?limit=1&offset=0')
        .auth(superAdminToken, { type: 'bearer' })
        .expect(200);

      expect(response.body.data.data).toHaveLength(1);
      expect(response.body.data.meta).toBeDefined();
      expect(response.body.data.meta.totalCount).toBeGreaterThanOrEqual(2);
    });

    it('should support pagination for page 2', async () => {
      const response = await request(app.getHttpServer())
        .get('/users?limit=1&offset=1')
        .auth(superAdminToken, { type: 'bearer' })
        .expect(200);

      expect(response.body.data.data).toHaveLength(1);
      expect(response.body.data.meta).toBeDefined();
      expect(response.body.data.meta.totalCount).toBeGreaterThanOrEqual(2);
      expect(response.body.data.meta.limit).toBe(1);
      expect(response.body.data.meta.offset).toBe(1);
    });

    it('should return empty array for out-of-bounds pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/users?limit=10&offset=1000')
        .auth(superAdminToken, { type: 'bearer' })
        .expect(200);

      expect(response.body.data.data).toHaveLength(0);
      expect(response.body.data.meta).toBeDefined();
      expect(response.body.data.meta.totalCount).toBeGreaterThanOrEqual(2);
      expect(response.body.data.meta.limit).toBe(10);
      expect(response.body.data.meta.offset).toBe(1000);
    });
  });

  describe('GET /users/:id', () => {
    it('should return user when super admin requests any profile', async () => {
      const response = await request(app.getHttpServer())
        .get(`/users/${regularUserId}`)
        .auth(superAdminToken, { type: 'bearer' })
        .expect(200);

      expect(response.body.data).toMatchObject({
        id: regularUserId,
        firstName: regularUserCredentials.firstName,
        lastName: regularUserCredentials.lastName,
        isSuperAdmin: false,
      });

      // Should include accounts when getting by ID
      expect(response.body.data.accounts).toBeDefined();
      expect(response.body.data.accounts).toBeInstanceOf(Array);
      expect(response.body.data.accounts[0]).toHaveProperty('email');
      expect(response.body.data.accounts[0]).not.toHaveProperty('password');
    });

    it('should return 404 when regular user tries to access any profile', async () => {
      // Regular users cannot access any profiles, not even their own
      await request(app.getHttpServer())
        .get(`/users/${regularUserId}`)
        .auth(regularUserToken, { type: 'bearer' })
        .expect(404);
    });

    it('should return 404 when user not found', async () => {
      const fakeUserId = `${ID_PREFIXES.USER}_00000000-0000-0000-0000-000000000000`;
      await request(app.getHttpServer())
        .get(`/users/${fakeUserId}`)
        .auth(superAdminToken, { type: 'bearer' })
        .expect(404);
    });

    it('should return 401 when not authenticated', async () => {
      await request(app.getHttpServer())
        .get(`/users/${regularUserId}`)
        .expect(401);
    });
  });

  describe('PATCH /users/:id', () => {
    it('should allow super admin to update any user', async () => {
      const updateData = {
        firstName: 'AdminUpdated',
        lastName: 'User',
      };

      const response = await request(app.getHttpServer())
        .patch(`/users/${regularUserId}`)
        .auth(superAdminToken, { type: 'bearer' })
        .send(updateData)
        .expect(200);

      expect(response.body.data).toMatchObject({
        id: regularUserId,
        firstName: updateData.firstName,
        lastName: updateData.lastName,
      });

      // Verify in database
      const dbUser = await prismaTesting.client.user.findUnique({
        where: { id: regularUserId },
      });
      expect(dbUser?.firstName).toBe(updateData.firstName);
      expect(dbUser?.lastName).toBe(updateData.lastName);
    });

    it('should return 404 when regular user tries to update any user', async () => {
      const updateData = {
        firstName: 'Hacker',
        lastName: 'Attempt',
      };

      // Regular users cannot update anyone, not even themselves
      await request(app.getHttpServer())
        .patch(`/users/${regularUserId}`)
        .auth(regularUserToken, { type: 'bearer' })
        .send(updateData)
        .expect(404);
    });

    it('should return 404 when updating non-existent user', async () => {
      const fakeUserId = `${ID_PREFIXES.USER}_00000000-0000-0000-0000-000000000000`;
      const updateData = {
        firstName: 'Ghost',
        lastName: 'User',
      };

      await request(app.getHttpServer())
        .patch(`/users/${fakeUserId}`)
        .auth(superAdminToken, { type: 'bearer' })
        .send(updateData)
        .expect(404);
    });

    it('should validate input data', async () => {
      const invalidData = {
        firstName: '', // Empty string should fail validation
        lastName: '',
      };

      await request(app.getHttpServer())
        .patch(`/users/${regularUserId}`)
        .auth(superAdminToken, { type: 'bearer' })
        .send(invalidData)
        .expect(400);
    });
  });

  describe('DELETE /users/:id', () => {
    it('should soft delete user when super admin', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/users/${regularUserId}`)
        .auth(superAdminToken, { type: 'bearer' })
        .expect(200);

      expect(response.body.data).toMatchObject({
        id: regularUserId,
      });

      // Verify soft delete in database
      const dbUser = await prismaTesting.client.user.findUnique({
        where: { id: regularUserId },
      });
      expect(dbUser).toBeTruthy();
      expect(dbUser?.deletedAt).toBeInstanceOf(Date);

      // Verify user is not returned in list
      const listResponse = await request(app.getHttpServer())
        .get('/users')
        .auth(superAdminToken, { type: 'bearer' })
        .expect(200);

      const deletedUserInList = listResponse.body.data.data.find(
        (u: any) => u.id === regularUserId,
      );
      expect(deletedUserInList).toBeUndefined();
    });

    it('should return 404 when regular user tries to delete (route hidden)', async () => {
      await request(app.getHttpServer())
        .delete(`/users/${superAdminId}`)
        .auth(regularUserToken, { type: 'bearer' })
        .expect(404); // SuperAdminGuard returns 404 to hide the route
    });

    it('should return 404 when deleting non-existent user', async () => {
      const fakeUserId = `${ID_PREFIXES.USER}_00000000-0000-0000-0000-000000000000`;

      await request(app.getHttpServer())
        .delete(`/users/${fakeUserId}`)
        .auth(superAdminToken, { type: 'bearer' })
        .expect(404);
    });

    it('should return 404 when deleting already deleted user', async () => {
      // First deletion
      await request(app.getHttpServer())
        .delete(`/users/${regularUserId}`)
        .auth(superAdminToken, { type: 'bearer' })
        .expect(200);

      // Second deletion should fail
      await request(app.getHttpServer())
        .delete(`/users/${regularUserId}`)
        .auth(superAdminToken, { type: 'bearer' })
        .expect(404);
    });
  });
});
