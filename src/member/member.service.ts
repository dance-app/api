import { Injectable } from '@nestjs/common';
import { Member, Workspace } from '@prisma/client';
import { DatabaseService } from 'src/database/database.service';
import { ErrorService } from 'src/error/error.service';
import { PaginationDto } from 'src/pagination/dto';
import { PaginationService } from 'src/pagination/pagination.service';

@Injectable()
export class MemberService {
  constructor(
    private database: DatabaseService,
    private pagination: PaginationService,
    private error: ErrorService,
  ) {}

  async readAll(
    workspaceId: Workspace['id'],
    paginationOptions: PaginationDto,
  ) {
    try {
      const totalCount = await this.database.member.count({
        where: { workspaceId },
      });

      const members = await this.database.member.findMany({
        where: { workspaceId },
        select: {
          user: {
            include: {
              accounts: {},
            },
          },
        },
        ...this.pagination.extractPaginationOptions(paginationOptions),
      });

      return {
        meta: {
          totalCount,
          count: members.length,
          ...paginationOptions,
        },
        data: members.map((m) => m.user),
      };
    } catch (error) {
      return this.error.handler(error);
    }
  }

  async readById(userId: Member['userId']) {
    try {
      const member = await this.database.member.findFirst({
        where: { userId },
      });

      return {
        data: member,
      };
    } catch (error) {
      return this.error.handler(error);
    }
  }

  async create(data: Member) {
    try {
      const newMember = await this.database.member.create({
        data,
      });

      return {
        message: 'Member created',
        data: newMember,
      };
    } catch (error) {
      return this.error.handler(error);
    }
  }

  async delete(data: Pick<Member, 'userId' | 'workspaceId'>) {
    try {
      const deletedMember = await this.database.member.delete({
        where: {
          userId_workspaceId: {
            userId: data.userId,
            workspaceId: data.workspaceId,
          },
        },
      });

      return {
        message: 'Member deleted',
        data: deletedMember,
      };
    } catch (error) {
      return this.error.handler(error);
    }
  }
}
