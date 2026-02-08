import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  Workspace,
  WorkspaceRole,
  Prisma,
  User,
  Member,
  InvitationStatus,
  InviteType,
} from '@prisma/client';
import { randomUUID } from 'crypto';

import { AddMemberDto } from './dto/add-member.dto';
import { MemberResponseDto } from './dto/member-response.dto';
import { SearchMembersDto } from './dto/search-member.dto';
import { getLevelName } from './enums/dance-level.enum';
import { MemberWithUser } from './member.types';
import { generateId, ID_PREFIXES } from '../lib/id-generator';

import { DatabaseService } from '@/database/database.service';
import { ERROR_MESSAGES } from '@/lib/constants';
import { PaginationDto } from '@/pagination/dto';
import { PaginationService } from '@/pagination/pagination.service';
import { WorkspaceService } from '@/workspace/workspace.service';

@Injectable()
export class MemberService {
  private readonly logger = new Logger(MemberService.name);

  constructor(
    private database: DatabaseService,
    @Inject(forwardRef(() => WorkspaceService))
    private workspaceService: WorkspaceService,
    private pagination: PaginationService,
  ) {}

  /**
   * Check if a user has any of the specified roles in a workspace
   * @param slug The workspace slug
   * @param userId The user ID to check
   * @param roles Array of roles to check for
   * @returns boolean indicating if the user has any of the roles
   */
  async userHasWorkspaceRoles(
    slug: string,
    userId: string,
    roles: WorkspaceRole[],
  ): Promise<boolean> {
    const workspace = await this.workspaceService.findWorkspaceBySlug(slug);
    if (!workspace) return false;

    const membership = await this.findUserMembershipInWorkspace(
      workspace.id,
      userId,
    );
    if (!membership) return false;

    // Check if the user has any of the required roles
    for (const role of roles) {
      if (membership.roles.includes(role)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Find a user's membership in a workspace (doesn't throw exceptions)
   * @param workspaceId The workspace ID
   * @param userId The user ID
   * @returns The membership or null if not found
   */
  async findUserMembershipInWorkspace(workspaceId: string, userId: string) {
    return this.database.member.findFirst({
      where: {
        workspaceId,
        userId,
        deletedAt: null,
      },
      select: { roles: true },
    });
  }

  mapToMemberResponseDto(member: Member | MemberWithUser): MemberResponseDto {
    return {
      id: member.id,
      name: member.name,
      user:
        'user' in member && member.user
          ? {
              id: member.user.id,
              firstName: member.user.firstName,
              lastName: member.user.lastName,
            }
          : null,
      roles: member.roles,
      level: member.level,
      levelName: getLevelName(member.level),
      preferredDanceRole: member.preferredDanceRole,
      workspaceId: member.workspaceId,
    };
  }

  async getWorkspaceBySlugIfExists(slug: string) {
    const workspace = await this.database.workspace.findUnique({
      where: { slug },
    });

    if (!workspace) {
      throw new NotFoundException(ERROR_MESSAGES.WORKSPACE_NOT_FOUND);
    }
    return workspace;
  }
  async getWorkspaceMembers(
    workspaceId: string,
    queryParams: SearchMembersDto,
    paginationOptions: PaginationDto,
  ) {
    const where: Prisma.MemberWhereInput = {
      workspaceId,
      deletedAt: null,
    };
    // Add search filter if provided (member name, user names, or account email)
    const searchTerm = queryParams.search?.trim();
    if (searchTerm) {
      where.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        {
          user: {
            OR: [
              {
                firstName: {
                  contains: searchTerm,
                  mode: 'insensitive',
                },
              },
              {
                lastName: {
                  contains: searchTerm,
                  mode: 'insensitive',
                },
              },
              {
                accounts: {
                  some: {
                    email: {
                      contains: searchTerm,
                      mode: 'insensitive',
                    },
                  },
                },
              },
            ],
          },
        },
      ];
    }

    // Add roles filter if provided
    if (queryParams.roles && queryParams.roles.length > 0) {
      where.preferredDanceRole = {
        in: queryParams.roles!,
      };
    }

    // Fetch the members with the filters
    const count = await this.database.member.count({
      where,
    });

    const members = await this.database.member.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        name: true,
        roles: true,
        preferredDanceRole: true,
        user: {
          select: {
            createdAt: true,
            updatedAt: true,
            id: true,
            firstName: true,
            lastName: true,
            accounts: {
              select: {
                email: true,
                isEmailVerified: true,
              },
            },
          },
        },
      },
      ...this.pagination.extractPaginationOptions(paginationOptions),
    });

    return this.pagination.createPaginatedResponse(
      members,
      count,
      paginationOptions,
    );
  }

  async getAllWorkspaceMembers(
    workspaceId: string,
    paginationOptions: PaginationDto,
  ) {
    return await this.getWorkspaceMembers(workspaceId, {}, paginationOptions);
  }

  async create(creator: User, data: AddMemberDto, workspace: Workspace) {
    // Check that the user is not already member
    if (data.userId !== undefined) {
      const existingMember = await this.database.member.findFirst({
        where: {
          userId: data.userId,
          workspaceId: workspace.id,
        },
      });

      if (existingMember) {
        throw new BadRequestException(ERROR_MESSAGES.USER_ALREADY_MEMBER);
      }
    }

    const contactEmail = data.email?.trim() || null;
    const contactPhone = data.phone?.trim() || null;
    if (contactEmail || contactPhone) {
      const existingInvitation = await this.database.invitation.findFirst({
        where: {
          type: InviteType.WORKSPACE,
          workspaceId: workspace.id,
          status: InvitationStatus.PENDING,
          OR: [
            contactEmail ? { email: contactEmail } : {},
            contactPhone ? { phone: contactPhone } : {},
          ],
        },
      });
      if (existingInvitation) {
        throw new BadRequestException(ERROR_MESSAGES.INVITATION_ALREADY_EXISTS);
      }
    }

    const memberSeat = await this.database.member.create({
      data: {
        id: generateId(ID_PREFIXES.MEMBER),
        createdById: creator.id,
        workspaceId: workspace.id,
        name: data.memberName
          ? data.memberName
          : data.email?.split('@')[0] || 'New Member',
        roles: {
          set: data.roles,
        },
        preferredDanceRole: data.preferredDanceRole,
        level: data.level,
      },
    });

    if (contactEmail || contactPhone) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await this.database.invitation.create({
        data: {
          type: InviteType.WORKSPACE,
          email: contactEmail,
          phone: contactPhone,
          firstName: null,
          lastName: null,
          token: randomUUID(),
          expiresAt,
          status: InvitationStatus.PENDING,
          workspaceId: workspace.id,
          inviterId: creator.id,
          memberSeatId: memberSeat.id,
        },
      });
    }

    return this.mapToMemberResponseDto(memberSeat);
  }

  async getMemberByUserId(userId: string, workspaceId: string) {
    const member = await this.database.member.findFirst({
      where: {
        userId: userId,
        workspaceId: workspaceId,
        deletedAt: null,
      },
    });
    return member;
  }

  async findMemberByUserId(userId: string, workspaceId: string) {
    const member = await this.getMemberByUserId(userId, workspaceId);
    if (!member) {
      throw new NotFoundException(ERROR_MESSAGES.MEMBER_NOT_FOUND);
    }
    return member;
  }

  async getMember(memberId: string) {
    const member = await this.database.member.findFirst({
      where: {
        id: memberId,
        deletedAt: null,
      },
    });
    return member;
  }

  async findMember(memberId: string) {
    const member = await this.getMember(memberId);
    if (!member) {
      throw new NotFoundException(ERROR_MESSAGES.MEMBER_NOT_FOUND);
    }
    return member;
  }

  async delete(memberId: string, removedById: string) {
    const result = await this.database.member.updateMany({
      where: {
        id: memberId,
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
        removedById,
      },
    });
    if (result.count === 0) {
      throw new NotFoundException(ERROR_MESSAGES.MEMBER_NOT_FOUND);
    }
  }
  async deleteByUserId(userId: string, workspaceId: string) {
    const result = await this.database.member.updateMany({
      where: {
        userId,
        workspaceId,
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
        removedById: null,
      },
    });
    if (result.count === 0) {
      throw new NotFoundException(ERROR_MESSAGES.MEMBER_NOT_FOUND);
    }
  }
}
