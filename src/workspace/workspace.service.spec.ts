import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { WorkspaceService } from './workspace.service';

import { DatabaseService } from '@/database/database.service';
import { PaginationService } from '@/pagination/pagination.service';

type MockWorkspaceDelegate = {
  findFirst: jest.Mock;
  update: jest.Mock;
};

type MockDatabaseService = {
  workspace: MockWorkspaceDelegate;
};

describe('WorkspaceService', () => {
  let service: WorkspaceService;
  let database: MockDatabaseService;

  beforeEach(async () => {
    database = {
      workspace: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
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
});
