import {
  Controller,
  Get,
  UseGuards,
  Param,
  Delete,
  Patch,
  Body,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse as SwaggerApiResponse,
  ApiParam,
} from '@nestjs/swagger';

import { UpdateUserDto, UserResponseDto } from './dto';
import { UserService } from './user.service';

import { JwtGuard } from '@/auth/guard';
import { SuperAdminGuard } from '@/auth/guard/super-admin.guard';
import { ApiResponse, buildResponse } from '@/lib/api-response';
import { GetPagination } from '@/pagination/decorator';
import { PaginationDto, PaginatedResponseDto } from '@/pagination/dto';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtGuard, SuperAdminGuard)
@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  @Get('')
  @ApiOperation({ summary: 'Get all users with pagination (super admin only)' })
  @SwaggerApiResponse({
    status: 200,
    description: 'List of users retrieved successfully',
  })
  @SwaggerApiResponse({
    status: 404,
    description: 'Not found - Super admin access required',
  })
  async getUsers(
    @GetPagination() paginationOptions: PaginationDto,
  ): Promise<ApiResponse<PaginatedResponseDto<UserResponseDto>>> {
    const result = await this.userService.readAll(paginationOptions);
    return buildResponse(result);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID (super admin only)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @SwaggerApiResponse({
    status: 200,
    description: 'User retrieved successfully',
  })
  @SwaggerApiResponse({
    status: 404,
    description: 'User not found or super admin access required',
  })
  async getUser(
    @Param('id') id: string,
  ): Promise<ApiResponse<UserResponseDto>> {
    const result = await this.userService.getById(id, true);
    return buildResponse(result);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user by ID (super admin only)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @SwaggerApiResponse({
    status: 200,
    description: 'User updated successfully',
  })
  @SwaggerApiResponse({
    status: 404,
    description: 'User not found or super admin access required',
  })
  async updateUser(
    @Param('id') id: string,
    @Body() data: UpdateUserDto,
  ): Promise<ApiResponse<UserResponseDto>> {
    const result = await this.userService.update(id, data);
    return buildResponse(result);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete user by ID (super admin only)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @SwaggerApiResponse({
    status: 200,
    description: 'User deleted successfully',
  })
  @SwaggerApiResponse({
    status: 404,
    description: 'User not found or super admin access required',
  })
  async delete(@Param('id') id: string): Promise<ApiResponse<UserResponseDto>> {
    const result = await this.userService.delete(id);
    return buildResponse(result);
  }
}
