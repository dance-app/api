import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { UserService } from './user.service';

import { DatabaseService } from '@/database/database.service';
import { ERROR_MESSAGES } from '@/lib/constants';
import { PaginationService } from '@/pagination/pagination.service';

type MockUserDelegate = {
  findFirst: jest.Mock;
  findMany: jest.Mock;
  findUnique: jest.Mock;
  update: jest.Mock;
  count: jest.Mock;
};

type MockAccountDelegate = {
  findFirst: jest.Mock;
};

type MockDatabaseService = {
  user: MockUserDelegate;
  account: MockAccountDelegate;
};

describe('UserService', () => {
  let service: UserService;
  let database: MockDatabaseService;

  beforeEach(async () => {
    database = {
      user: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      account: {
        findFirst: jest.fn(),
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        UserService,
        PaginationService,
        {
          provide: DatabaseService,
          useValue: database as unknown as DatabaseService,
        },
      ],
    }).compile();

    service = moduleRef.get(UserService);
  });

  describe('toDto', () => {
    it('should transform user to DTO without accounts', () => {
      const user = {
        id: 'user_123',
        firstName: 'John',
        lastName: 'Doe',
        isSuperAdmin: false,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
        token: 'secret-token',
        deletedAt: null,
      };

      const result = service.toDto(user as any, false);

      expect(result).toEqual({
        id: 'user_123',
        firstName: 'John',
        lastName: 'Doe',
        isSuperAdmin: false,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      });
      expect(result).not.toHaveProperty('token');
      expect(result).not.toHaveProperty('deletedAt');
    });

    it('should transform user to DTO with accounts', () => {
      const user = {
        id: 'user_123',
        firstName: 'John',
        lastName: 'Doe',
        isSuperAdmin: false,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
        token: null,
        deletedAt: null,
        accounts: [
          {
            id: 'acc_456',
            email: 'john@test.com',
            provider: 'LOCAL',
            isEmailVerified: true,
            password: 'hashed-password',
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-01'),
            userId: 'user_123',
          },
        ],
      };

      const result = service.toDto(user as any, true);

      expect(result.accounts).toBeDefined();
      expect(result.accounts).toHaveLength(1);
      expect(result.accounts![0]).toEqual({
        id: 'acc_456',
        email: 'john@test.com',
        provider: 'LOCAL',
        isEmailVerified: true,
        createdAt: user.accounts[0].createdAt,
        updatedAt: user.accounts[0].updatedAt,
      });
      expect(result.accounts![0]).not.toHaveProperty('password');
    });
  });

  describe('toDtoList', () => {
    it('should transform array of users to DTOs', () => {
      const users = [
        {
          id: 'user_1',
          firstName: 'John',
          lastName: 'Doe',
          isSuperAdmin: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          token: null,
          deletedAt: null,
        },
        {
          id: 'user_2',
          firstName: 'Jane',
          lastName: 'Doe',
          isSuperAdmin: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          token: null,
          deletedAt: null,
        },
      ];

      const result = service.toDtoList(users as any);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('user_1');
      expect(result[1].id).toBe('user_2');
    });
  });

  describe('readAll', () => {
    it('should return paginated users', async () => {
      const mockUsers = [
        {
          id: 'user_1',
          firstName: 'John',
          lastName: 'Doe',
          isSuperAdmin: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          token: null,
          deletedAt: null,
        },
      ];

      database.user.count.mockResolvedValue(1);
      database.user.findMany.mockResolvedValue(mockUsers);

      const result = await service.readAll({ limit: 10, offset: 0 });

      expect(database.user.count).toHaveBeenCalledWith({
        where: { deletedAt: null },
      });
      expect(database.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deletedAt: null },
        }),
      );
      expect(result.data).toHaveLength(1);
      expect(result.meta.totalCount).toBe(1);
    });

    it('should filter out deleted users', async () => {
      database.user.count.mockResolvedValue(0);
      database.user.findMany.mockResolvedValue([]);

      await service.readAll({ limit: 10, offset: 0 });

      expect(database.user.count).toHaveBeenCalledWith({
        where: { deletedAt: null },
      });
      expect(database.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deletedAt: null },
        }),
      );
    });
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      const mockUser = {
        id: 'user_123',
        firstName: 'John',
        lastName: 'Doe',
        isSuperAdmin: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        token: null,
        deletedAt: null,
      };

      database.user.findFirst.mockResolvedValue(mockUser);

      const result = await service.findById('user_123');

      expect(database.user.findFirst).toHaveBeenCalledWith({
        where: { id: 'user_123', deletedAt: null },
        include: { accounts: false },
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      database.user.findFirst.mockResolvedValue(null);

      const result = await service.findById('user_nonexistent');

      expect(result).toBeNull();
    });

    it('should include accounts when requested', async () => {
      const mockUser = {
        id: 'user_123',
        accounts: [],
      };

      database.user.findFirst.mockResolvedValue(mockUser);

      await service.findById('user_123', true);

      expect(database.user.findFirst).toHaveBeenCalledWith({
        where: { id: 'user_123', deletedAt: null },
        include: { accounts: true },
      });
    });
  });

  describe('getById', () => {
    it('should return user DTO when found', async () => {
      const mockUser = {
        id: 'user_123',
        firstName: 'John',
        lastName: 'Doe',
        isSuperAdmin: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        token: null,
        deletedAt: null,
      };

      database.user.findFirst.mockResolvedValue(mockUser);

      const result = await service.getById('user_123');

      expect(result).toEqual({
        id: 'user_123',
        firstName: 'John',
        lastName: 'Doe',
        isSuperAdmin: false,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      database.user.findFirst.mockResolvedValue(null);

      await expect(service.getById('user_nonexistent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getById('user_nonexistent')).rejects.toThrow(
        ERROR_MESSAGES.USER_NOT_FOUND,
      );
    });
  });

  describe('update', () => {
    it('should update and return user DTO', async () => {
      const existingUser = {
        id: 'user_123',
        firstName: 'John',
        lastName: 'Doe',
        deletedAt: null,
      };

      const updatedUser = {
        id: 'user_123',
        firstName: 'Jane',
        lastName: 'Smith',
        isSuperAdmin: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        token: null,
        deletedAt: null,
        accounts: [],
      };

      database.user.findFirst.mockResolvedValue(existingUser);
      database.user.update.mockResolvedValue(updatedUser);

      const result = await service.update('user_123', {
        firstName: 'Jane',
        lastName: 'Smith',
        password: '',
        isSuperAdmin: false,
        isVerified: false,
      });

      expect(database.user.update).toHaveBeenCalledWith({
        where: { id: 'user_123' },
        data: {
          firstName: 'Jane',
          lastName: 'Smith',
        },
        include: { accounts: true },
      });
      expect(result.firstName).toBe('Jane');
      expect(result.lastName).toBe('Smith');
    });

    it('should throw NotFoundException when user not found', async () => {
      database.user.findFirst.mockResolvedValue(null);

      await expect(
        service.update('user_nonexistent', {
          firstName: 'Jane',
          lastName: 'Smith',
          password: '',
          isSuperAdmin: false,
          isVerified: false,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('readByEmail', () => {
    it('should return user when account found', async () => {
      const mockAccount = {
        id: 'acc_123',
        email: 'john@test.com',
        user: {
          id: 'user_123',
          firstName: 'John',
          lastName: 'Doe',
        },
      };

      database.account.findFirst.mockResolvedValue(mockAccount);

      const result = await service.readByEmail('john@test.com');

      expect(database.account.findFirst).toHaveBeenCalledWith({
        where: { email: 'john@test.com' },
        include: { user: true },
      });
      expect(result).toEqual(mockAccount.user);
    });

    it('should return null when account not found', async () => {
      database.account.findFirst.mockResolvedValue(null);

      const result = await service.readByEmail('nonexistent@test.com');

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should soft delete user', async () => {
      const mockUser = {
        id: 'user_123',
        firstName: 'John',
        lastName: 'Doe',
        deletedAt: null,
      };

      const deletedUser = {
        ...mockUser,
        isSuperAdmin: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        token: null,
        deletedAt: new Date(),
      };

      database.user.findFirst.mockResolvedValue(mockUser);
      database.user.update.mockResolvedValue(deletedUser);

      const result = await service.delete('user_123');

      expect(database.user.findFirst).toHaveBeenCalledWith({
        where: { id: 'user_123', deletedAt: null },
      });
      expect(database.user.update).toHaveBeenCalledWith({
        where: { id: 'user_123' },
        data: { deletedAt: expect.any(Date) },
      });
      expect(result.id).toBe('user_123');
    });

    it('should throw NotFoundException when user not found', async () => {
      database.user.findFirst.mockResolvedValue(null);

      await expect(service.delete('user_nonexistent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.delete('user_nonexistent')).rejects.toThrow(
        ERROR_MESSAGES.USER_NOT_FOUND,
      );
    });

    it('should throw NotFoundException when user already deleted', async () => {
      database.user.findFirst.mockResolvedValue(null);

      await expect(service.delete('user_123')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
