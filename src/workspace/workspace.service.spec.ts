import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { WorkspaceService } from './workspace.service';

import { DatabaseService } from '@/database/database.service';
import { PaginationService } from '@/pagination/pagination.service';
import { UserWithAccount } from '@/user/user.types';

type MockWorkspaceDelegate = {
  findFirst: jest.Mock;
  update: jest.Mock;
  create: jest.Mock;
  count: jest.Mock;
  findMany: jest.Mock;
  findUnique: jest.Mock;
};

type MockMemberDelegate = {
  create: jest.Mock;
};

type MockWorkspaceConfigDelegate = {
  create: jest.Mock;
};

type MockDatabaseService = {
  workspace: MockWorkspaceDelegate;
  member: MockMemberDelegate;
  workspaceConfig: MockWorkspaceConfigDelegate;
  $transaction: jest.Mock;
};

describe('WorkspaceService', () => {
  let service: WorkspaceService;
  let database: MockDatabaseService;

  beforeEach(async () => {
    database = {
      workspace: {
        findFirst: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      member: {
        create: jest.fn(),
      },
      workspaceConfig: {
        create: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(database)),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        WorkspaceService,
        PaginationService,
        {
          provide: DatabaseService,
          useValue: database as unknown as DatabaseService,
        },
      ],
    }).compile();

    service = moduleRef.get(WorkspaceService);
  });

  describe('delete', () => {
    const workspaceRecord = {
      id: 1,
      name: 'Demo Workspace',
      slug: 'demo-workspace',
      deletedAt: null,
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-02T00:00:00.000Z'),
    };

    it('soft deletes the workspace and clears the slug', async () => {
      database.workspace.findFirst.mockResolvedValue(workspaceRecord);
      database.workspace.update.mockImplementation(
        async ({
          data,
        }: {
          data: { deletedAt: Date; slug: string | null };
        }) => ({
          ...workspaceRecord,
          deletedAt: data.deletedAt,
          slug: data.slug,
        }),
      );

      const result = await service.delete(workspaceRecord.id);

      expect(database.workspace.findFirst).toHaveBeenCalledWith({
        where: { id: workspaceRecord.id, deletedAt: null },
      });
      expect(database.workspace.update).toHaveBeenCalledWith({
        where: { id: workspaceRecord.id },
        data: expect.objectContaining({
          deletedAt: expect.any(Date),
          slug: null,
        }),
      });
      expect(result.message).toBe('Workspace deleted');
      expect(result.data.slug).toBeNull();
      expect(result.data.deletedAt).toBeInstanceOf(Date);
    });

    it('throws when the workspace is already deleted or missing', async () => {
      database.workspace.findFirst.mockResolvedValue(null);

      await expect(service.delete(workspaceRecord.id)).rejects.toThrow(
        NotFoundException,
      );

      expect(database.workspace.update).not.toHaveBeenCalled();
    });
  });

  describe('canAccessWorkspace', () => {
    const mockUser: UserWithAccount = {
      id: 1,
      firstName: 'Test',
      lastName: 'User',
      isSuperAdmin: false,
      accounts: [],
    } as UserWithAccount;

    const workspaceRecord = {
      id: 1,
      name: 'Test Workspace',
      slug: 'test-workspace',
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('returns true when workspace does not exist', async () => {
      database.workspace.findFirst.mockResolvedValue(null);

      const result = await service.canAccessWorkspace(mockUser, 'non-existent');

      expect(result).toBe(true); // Let controller handle 404
      expect(database.workspace.findFirst).toHaveBeenCalledWith({
        where: { slug: 'non-existent' },
      });
    });

    it('returns true when workspace is deleted', async () => {
      database.workspace.findFirst.mockResolvedValue({
        ...workspaceRecord,
        deletedAt: new Date(),
      });

      const result = await service.canAccessWorkspace(
        mockUser,
        'deleted-workspace',
      );

      expect(result).toBe(true); // Let controller handle 404
    });

    it('returns true when user is super admin', async () => {
      database.workspace.findFirst.mockResolvedValue(workspaceRecord);

      const superAdminUser = { ...mockUser, isSuperAdmin: true };
      const result = await service.canAccessWorkspace(
        superAdminUser,
        'test-workspace',
      );

      expect(result).toBe(true);
    });

    it('returns true when user is a member', async () => {
      database.workspace.findFirst
        .mockResolvedValueOnce(workspaceRecord) // First call finds workspace
        .mockResolvedValueOnce(workspaceRecord); // Second call finds membership

      const result = await service.canAccessWorkspace(
        mockUser,
        'test-workspace',
      );

      expect(result).toBe(true);
      expect(database.workspace.findFirst).toHaveBeenCalledTimes(2);
    });

    it('returns false when user is not a member', async () => {
      database.workspace.findFirst
        .mockResolvedValueOnce(workspaceRecord) // First call finds workspace
        .mockResolvedValueOnce(null); // Second call finds no membership

      const result = await service.canAccessWorkspace(
        mockUser,
        'test-workspace',
      );

      expect(result).toBe(false); // 403 Forbidden
    });
  });

  describe('getWorkspaceBySlug', () => {
    const workspaceRecord = {
      id: 1,
      name: 'Test Workspace',
      slug: 'test-workspace',
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdById: 1,
    };

    it('returns workspace when found', async () => {
      database.workspace.findFirst.mockResolvedValue(workspaceRecord);

      const result = await service.getWorkspaceBySlug('test-workspace');

      expect(database.workspace.findFirst).toHaveBeenCalledWith({
        where: { slug: 'test-workspace', deletedAt: null },
        include: undefined,
      });
      expect(result).toEqual(
        expect.objectContaining({
          id: 1,
          name: 'Test Workspace',
          slug: 'test-workspace',
          createdAt: workspaceRecord.createdAt,
          updatedAt: workspaceRecord.updatedAt,
        }),
      );
    });

    it('throws NotFoundException when workspace not found', async () => {
      database.workspace.findFirst.mockResolvedValue(null);

      await expect(
        service.getWorkspaceBySlug('test-workspace'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const workspaceRecord = {
      id: 1,
      name: 'Old Name',
      slug: 'test-workspace',
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdById: 1,
    };

    it('updates workspace name', async () => {
      database.workspace.update.mockResolvedValue({
        ...workspaceRecord,
        name: 'New Name',
      });

      const result = await service.update(1, { name: 'New Name' });

      expect(database.workspace.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { name: 'New Name' },
      });
      expect(result.message).toBe('User updated');
      expect(result.data.name).toBe('New Name');
    });
  });

  describe('readById', () => {
    const workspaceRecord = {
      id: 1,
      name: 'Test Workspace',
      slug: 'test-workspace',
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('returns workspace when found', async () => {
      database.workspace.findFirst.mockResolvedValue(workspaceRecord);

      const result = await service.readById({ id: 1 });

      expect(database.workspace.findFirst).toHaveBeenCalledWith({
        where: { id: 1, deletedAt: null },
      });
      expect(result.data).toEqual(workspaceRecord);
    });

    it('returns null data when workspace not found', async () => {
      database.workspace.findFirst.mockResolvedValue(null);

      const result = await service.readById({ id: 999 });

      expect(result.data).toBeNull();
    });
  });
});
