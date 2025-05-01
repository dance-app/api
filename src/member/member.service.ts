import { Injectable } from '@nestjs/common';
import { Member, Workspace } from '@prisma/client';

import { DatabaseService } from '@/database/database.service';
import { PaginationDto } from '@/pagination/dto';
import { PaginationService } from '@/pagination/pagination.service';

@Injectable()
export class MemberService {
  constructor(
    private database: DatabaseService,
    private pagination: PaginationService,
  ) {}

  async readAll(
    workspaceId: Workspace['id'],
    paginationOptions: PaginationDto,
  ) {
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
  }

  async readById(userId: Member['userId']) {
    const member = await this.database.member.findFirst({
      where: { userId },
    });

    return {
      data: member,
    };
  }

  async create(data: Member) {
    const newMember = await this.database.member.create({
      data,
    });

    return {
      message: 'Member created',
      data: newMember,
    };
  }

  async delete(data: Pick<Member, 'userId' | 'workspaceId'>) {
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
  }
}
