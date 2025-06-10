import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { JwtModule } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import {
  DanceCategory,
  DanceTypeEnum,
  DanceType,
  User,
  Workspace,
} from '@prisma/client';
import request from 'supertest';

import { AppModule } from '../app.module';

import { MailService } from '@/mail/mail.service';
import { MockMailService } from '@/test/mock-mail.service';
import { PrismaTestingService } from '@/test/prisma-testing.service';

describe('Dance CRUD', () => {
  let app: INestApplication;
  const prismaTesting = new PrismaTestingService();
  let mailService: MockMailService;

  // Test data
  let authToken: string;
  let testUser: User;
  let testWorkspace: Workspace;
  let createdDanceType: DanceType;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        EventEmitterModule.forRoot(),
        AppModule,
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

    // Set up test user and workspace
    await setupTestData();
  });

  afterAll(async () => {
    await prismaTesting.close();
    await app.close();
  });

  const setupTestData = async () => {
    // Create a test user and get auth token
    const userResponse = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      })
      .expect(201);

    testUser = userResponse.body.user;
    authToken = userResponse.body.accessToken;

    // Create a test workspace
    const workspaceResponse = await request(app.getHttpServer())
      .post('/workspaces')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Test Dance Studio',
        slug: 'test-dance-studio',
      })
      .expect(201);

    testWorkspace = workspaceResponse.body;
  };

  describe('DanceType CRUD', () => {
    describe('POST /dance/types', () => {
      it('should create a dance type successfully', async () => {
        const createDto = {
          name: 'Salsa On1',
          type: DanceTypeEnum.SALSA,
          category: DanceCategory.LATIN,
          description: 'Linear style of Salsa dancing',
        };

        const response = await request(app.getHttpServer())
          .post('/dance/types')
          .set('Authorization', `Bearer ${authToken}`)
          .send(createDto)
          .expect(201);

        expect(response.body).toMatchObject({
          id: expect.any(Number),
          name: createDto.name,
          type: createDto.type,
          category: createDto.category,
          description: createDto.description,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
          workspaces: [],
        });

        createdDanceType = response.body;
      });

      it('should fail to create dance type with duplicate name', async () => {
        const createDto = {
          name: 'Salsa On1', // Same name as above
          type: DanceTypeEnum.BACHATA,
          category: DanceCategory.LATIN,
        };

        await request(app.getHttpServer())
          .post('/dance/types')
          .set('Authorization', `Bearer ${authToken}`)
          .send(createDto)
          .expect(409);
      });

      it('should fail to create dance type without authentication', async () => {
        const createDto = {
          name: 'Tango',
          type: DanceTypeEnum.TANGO,
          category: DanceCategory.BALLROOM,
        };

        await request(app.getHttpServer())
          .post('/dance/types')
          .send(createDto)
          .expect(401);
      });

      it('should fail with invalid data', async () => {
        const createDto = {
          name: 'A', // Too short
          type: 'INVALID_TYPE',
          category: 'INVALID_CATEGORY',
        };

        await request(app.getHttpServer())
          .post('/dance/types')
          .set('Authorization', `Bearer ${authToken}`)
          .send(createDto)
          .expect(400);
      });

      it('should fail when type field is missing', async () => {
        const createDto = {
          name: 'Bachata',
          category: DanceCategory.LATIN,
        };

        await request(app.getHttpServer())
          .post('/dance/types')
          .set('Authorization', `Bearer ${authToken}`)
          .send(createDto)
          .expect(400);
      });
    });

    describe('GET /dance/types', () => {
      it('should get all dance types with pagination', async () => {
        const response = await request(app.getHttpServer())
          .get('/dance/types')
          .set('Authorization', `Bearer ${authToken}`)
          .query({ page: 1, pageSize: 10 })
          .expect(200);

        expect(response.body).toMatchObject({
          data: expect.any(Array),
          meta: {
            page: 1,
            pageSize: 10,
            total: expect.any(Number),
            totalPages: expect.any(Number),
          },
        });

        expect(response.body.data.length).toBeGreaterThan(0);
        expect(response.body.data[0]).toMatchObject({
          id: expect.any(Number),
          name: expect.any(String),
          type: expect.any(String),
          workspaces: expect.any(Array),
        });
      });
    });

    describe('GET /dance/types/:id', () => {
      it('should get a specific dance type', async () => {
        const response = await request(app.getHttpServer())
          .get(`/dance/types/${createdDanceType.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toMatchObject({
          id: createdDanceType.id,
          name: createdDanceType.name,
          type: createdDanceType.type,
          category: createdDanceType.category,
          description: createdDanceType.description,
          workspaces: expect.any(Array),
        });
      });

      it('should return 404 for non-existent dance type', async () => {
        await request(app.getHttpServer())
          .get('/dance/types/99999')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404);
      });
    });

    describe('PATCH /dance/types/:id', () => {
      it('should update a dance type successfully', async () => {
        const updateDto = {
          name: 'Salsa On1 Updated',
          description: 'Updated description for Salsa On1',
          category: DanceCategory.CONTEMPORARY,
        };

        const response = await request(app.getHttpServer())
          .patch(`/dance/types/${createdDanceType.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(updateDto)
          .expect(200);

        expect(response.body).toMatchObject({
          id: createdDanceType.id,
          name: updateDto.name,
          description: updateDto.description,
          category: updateDto.category,
          type: createdDanceType.type, // Should remain unchanged
        });

        createdDanceType = response.body;
      });

      it('should allow updating only the type field', async () => {
        const updateDto = {
          type: DanceTypeEnum.BACHATA,
        };

        const response = await request(app.getHttpServer())
          .patch(`/dance/types/${createdDanceType.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(updateDto)
          .expect(200);

        expect(response.body.type).toBe(updateDto.type);
        expect(response.body.name).toBe(createdDanceType.name); // Should remain unchanged

        createdDanceType = response.body;
      });

      it('should return 404 for non-existent dance type', async () => {
        await request(app.getHttpServer())
          .patch('/dance/types/99999')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ name: 'Updated' })
          .expect(404);
      });
    });

    describe('Workspace Relationships', () => {
      it('should link dance type to workspace', async () => {
        await request(app.getHttpServer())
          .post(
            `/dance/types/${createdDanceType.id}/workspaces/${testWorkspace.id}`,
          )
          .set('Authorization', `Bearer ${authToken}`)
          .expect(201);

        // Verify the link was created
        const response = await request(app.getHttpServer())
          .get(`/dance/types/${createdDanceType.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.workspaces).toContainEqual(
          expect.objectContaining({ id: testWorkspace.id }),
        );
      });

      it('should unlink dance type from workspace', async () => {
        await request(app.getHttpServer())
          .delete(
            `/dance/types/${createdDanceType.id}/workspaces/${testWorkspace.id}`,
          )
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        // Verify the link was removed
        const response = await request(app.getHttpServer())
          .get(`/dance/types/${createdDanceType.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.workspaces).not.toContainEqual(
          expect.objectContaining({ id: testWorkspace.id }),
        );
      });

      it('should fail to link with non-existent dance type', async () => {
        await request(app.getHttpServer())
          .post(`/dance/types/99999/workspaces/${testWorkspace.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404);
      });
    });

    describe('DELETE /dance/types/:id', () => {
      it('should delete dance type successfully', async () => {
        await request(app.getHttpServer())
          .delete(`/dance/types/${createdDanceType.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        // Verify deletion
        await request(app.getHttpServer())
          .get(`/dance/types/${createdDanceType.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404);
      });

      it('should return 404 when deleting non-existent resource', async () => {
        await request(app.getHttpServer())
          .delete('/dance/types/99999')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404);
      });
    });
  });

  describe('Validation Tests', () => {
    it('should create dance types with different types but same category', async () => {
      const dto1 = {
        name: 'Bachata Sensual',
        type: DanceTypeEnum.BACHATA,
        category: DanceCategory.LATIN,
      };

      const dto2 = {
        name: 'Kizomba Flow',
        type: DanceTypeEnum.KIZOMBA,
        category: DanceCategory.LATIN,
      };

      await request(app.getHttpServer())
        .post('/dance/types')
        .set('Authorization', `Bearer ${authToken}`)
        .send(dto1)
        .expect(201);

      await request(app.getHttpServer())
        .post('/dance/types')
        .set('Authorization', `Bearer ${authToken}`)
        .send(dto2)
        .expect(201);
    });

    it('should create dance type without category', async () => {
      const dto = {
        name: 'Custom Dance',
        type: DanceTypeEnum.OTHER,
      };

      const response = await request(app.getHttpServer())
        .post('/dance/types')
        .set('Authorization', `Bearer ${authToken}`)
        .send(dto)
        .expect(201);

      expect(response.body.category).toBeNull();
    });
  });
});
