import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Workspace, WorkspaceRole, Prisma, User, Member } from '@prisma/client';

import { AddMemberDto } from './dto/add-member.dto';
import { MemberResponseDto } from './dto/member-response.dto';
import { SearchMembersDto } from './dto/search-member.dto';
import { getLevelName, getLevelValue } from './enums/dance-level.enum';
import { MemberWithUser } from './member.types';
import { generateId, ID_PREFIXES } from '../lib/id-generator';

import { DatabaseService } from '@/database/database.service';
import { PaginatedResponseDto, PaginationDto } from '@/pagination/dto';
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
      preferedDanceRole: member.preferedDanceRole,
      workspaceId: member.workspaceId,
    };
  }

  async getWorkspaceBySlugIfExists(slug: string) {
    const workspace = await this.database.workspace.findUnique({
      where: { slug },
    });

    if (!workspace) {
      throw new NotFoundException(`Workspace with slug ${slug} not found`);
    }
    return workspace;
  }
  async getWorkspaceMembers(
    workspaceId: string,
    queryParams: SearchMembersDto,
    paginationOptions: PaginationDto,
  ): Promise<PaginatedResponseDto<MemberResponseDto>> {
    const where: Prisma.MemberWhereInput = {
      workspaceId,
    };
    // Add search filter if provided
    if (queryParams.search) {
      where.OR = [
        { name: { contains: queryParams.search, mode: 'insensitive' } },
        {
          user: {
            OR: [
              {
                firstName: {
                  contains: queryParams.search,
                  mode: 'insensitive',
                },
              },
              {
                lastName: { contains: queryParams.search, mode: 'insensitive' },
              },
            ],
          },
        },
      ];
    }

    // Add roles filter if provided
    if (queryParams.roles && queryParams.roles.length > 0) {
      where.preferedDanceRole = {
        in: queryParams.roles!,
      };
    }

    // Handle level filtering
    if (queryParams.level) {
      // Convert level name to numeric value
      const levelValue = getLevelValue(queryParams.level);
      if (levelValue === null) {
        throw new BadRequestException(`Invalid level: ${queryParams.level}`);
      }
      where.level = levelValue;
    } else {
      // Handle min and max level filtering
      if (
        queryParams.minLevel !== undefined ||
        queryParams.maxLevel !== undefined
      ) {
        where.level = {};

        if (queryParams.minLevel !== undefined) {
          where.level.gte = queryParams.minLevel;
        }

        if (queryParams.maxLevel !== undefined) {
          where.level.lte = queryParams.maxLevel;
        }
      }
    }

    // Fetch the members with the filters
    const count = await this.database.member.count({
      where,
    });

    const members = await this.database.member.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      ...this.pagination.extractPaginationOptions(paginationOptions),
    });

    // Map numeric levels to their string representations in the response
    return this.pagination.createPaginatedResponse(
      members.map((member) => this.mapToMemberResponseDto(member)),
      count,
      paginationOptions,
    );
  }

  async getAllWorkspaceMembers(
    workspaceId: string,
    paginationOptions: PaginationDto,
  ): Promise<PaginatedResponseDto<MemberResponseDto>> {
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
        throw new BadRequestException(
          'User is already a member of this workspace',
        );
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
        preferedDanceRole: data.preferedDanceRole,
        level: data.level,
      },
    });

    return this.mapToMemberResponseDto(memberSeat);
  }

  async getMemberByUserId(userId: string, workspaceId: string) {
    const member = await this.database.member.findFirst({
      where: {
        userId: userId,
        workspaceId: workspaceId,
      },
    });
    return member;
  }

  async findMemberByUserId(userId: string, workspaceId: string) {
    const member = await this.getMemberByUserId(userId, workspaceId);
    if (!!member) {
      throw new NotFoundException('Member does not exist.');
    }
    return member;
  }

  async getMember(memberId: string) {
    const member = await this.database.member.findFirst({
      where: {
        id: memberId,
      },
    });
    return member;
  }

  async findMember(memberId: string) {
    const member = await this.getMember(memberId);
    if (!!member) {
      throw new NotFoundException('Member does not exist.');
    }
    return member;
  }

  async delete(memberId: string) {
    const deletedMember = await this.database.member.delete({
      where: {
        id: memberId,
      },
    });

    if (!!deletedMember) throw new NotFoundException('Member does not exist');
  }
  async deleteByUserId(userId: string, workspaceId: string) {
    const memberToDelete = await this.findMemberByUserId(userId, workspaceId);

    const deletedMember = await this.database.member.delete({
      where: {
        id: memberToDelete.id,
      },
    });

    return {
      message: 'Member deleted',
      data: deletedMember,
    };
  }
}
