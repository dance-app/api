import { Injectable, NotFoundException } from '@nestjs/common';
import { User } from '@prisma/client';

import { UpdateUserDto, UserResponseDto, SafeAccountDto } from './dto';
import { UserWithAccount } from './user.types';

import { DatabaseService } from '@/database/database.service';
import { ERROR_MESSAGES } from '@/lib/constants';
import { PaginationDto } from '@/pagination/dto';
import { PaginatedResponseDto } from '@/pagination/dto';
import { PaginationService } from '@/pagination/pagination.service';

@Injectable({})
export class UserService {
  constructor(
    private database: DatabaseService,
    private pagination: PaginationService,
  ) {}

  /**
   * Transform a User to UserResponseDto
   * Excludes sensitive data like passwords
   */
  toDto(
    user: User | UserWithAccount,
    includeAccounts = false,
  ): UserResponseDto {
    const dto: UserResponseDto = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      isSuperAdmin: user.isSuperAdmin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    if (includeAccounts && 'accounts' in user && user.accounts) {
      dto.accounts = user.accounts.map(
        (account): SafeAccountDto => ({
          id: account.id,
          email: account.email,
          provider: account.provider,
          isEmailVerified: account.isEmailVerified,
          createdAt: account.createdAt,
          updatedAt: account.updatedAt,
          // NEVER include password
        }),
      );
    }

    return dto;
  }

  /**
   * Transform array of Users to UserResponseDto[]
   */
  toDtoList(users: User[] | UserWithAccount[]): UserResponseDto[] {
    return users.map((user) => this.toDto(user, false));
  }

  async readAll(
    paginationOptions: PaginationDto,
  ): Promise<PaginatedResponseDto<UserResponseDto>> {
    const userCount = await this.database.user.count({
      where: { deletedAt: null },
    });

    const users = await this.database.user.findMany({
      where: { deletedAt: null },
      ...this.pagination.extractPaginationOptions(paginationOptions),
    });

    return this.pagination.createPaginatedResponse(
      this.toDtoList(users),
      userCount,
      paginationOptions,
    );
  }

  async findById(
    userId: User['id'],
    includeAccounts = false,
  ): Promise<User | UserWithAccount | null> {
    const user = await this.database.user.findFirst({
      where: { id: userId, deletedAt: null },
      include: {
        accounts: includeAccounts,
      },
    });

    return user;
  }

  async getById(
    userId: User['id'],
    includeAccounts = false,
  ): Promise<UserResponseDto> {
    const user = await this.findById(userId, includeAccounts);
    if (!user) {
      throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
    }
    return this.toDto(user, includeAccounts);
  }

  async update(id: string, data: UpdateUserDto): Promise<UserResponseDto> {
    // Check if user exists
    const existingUser = await this.findById(id);
    if (!existingUser) {
      throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    const updatedUser = await this.database.user.update({
      where: { id },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
      },
      include: { accounts: true },
    });

    return this.toDto(updatedUser, true);
  }

  async readByEmail(email: string): Promise<User | null> {
    const account = await this.database.account.findFirst({
      where: { email },
      include: { user: true },
    });

    return account?.user ?? null;
  }

  async delete(id: string): Promise<UserResponseDto> {
    // Check if user exists and is not already deleted
    const user = await this.database.user.findFirst({
      where: { id, deletedAt: null },
    });

    if (!user) {
      throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    // Soft delete the user
    const deletedUser = await this.database.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return this.toDto(deletedUser);
  }
}
