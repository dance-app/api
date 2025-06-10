import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Notification } from '@prisma/client';

//import { NotificationResponseDto } from './dto/notification-response.dto';
import { SearchNotificationsDto } from './dto/search-notifications.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { NotificationService } from './notification.service';

import { GetAuthUser } from '@/auth/decorator';
import { JwtGuard } from '@/auth/guard';
//import { SuperAdminGuard } from '@/auth/guard/super-admin.guard';
import { PaginatedResponseDto, PaginationDto } from '@/pagination/dto';
import { UserWithAccount } from '@/user/user.types';

@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller('notifications')
@ApiTags('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  /*@Post()
  @UseGuards(SuperAdminGuard)
  @ApiOperation({ summary: 'Create a new notification (super admin only)' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Notification created successfully',
    type: NotificationResponseDto,
  })
  async createNotification(
    @Body() createNotificationDto: CreateNotificationDto,
  ): Promise<NotificationResponseDto> {
    return this.notificationService.create(createNotificationDto);
  }*/

  @Get()
  @ApiOperation({ summary: 'Get all notifications for the current user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of user notifications',
    type: [Notification], // TODO DTO
  })
  async getUserNotifications(
    @GetAuthUser() user: UserWithAccount,
    @Query() queryParams: SearchNotificationsDto,
    @Query() pagintationParams: PaginationDto,
  ): Promise<PaginatedResponseDto<Notification>> {
    // Extract pagination from the combined DTO
    const paginationOptions: PaginationDto = {
      limit: pagintationParams.limit,
      offset: pagintationParams.offset,
    };

    // Extract search params (exclude pagination)
    const searchParams = {
      read: queryParams.read,
      type: queryParams.type,
    };

    return this.notificationService.getUserNotifications(
      user.id,
      searchParams,
      paginationOptions,
    );
  }

  @Get('unread-count')
  @ApiOperation({
    summary: 'Get count of unread notifications for the current user',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Unread notification count',
    schema: {
      type: 'object',
      properties: {
        count: { type: 'number' },
      },
    },
  })
  async getUnreadCount(
    @GetAuthUser() user: UserWithAccount,
  ): Promise<{ count: number }> {
    const count = await this.notificationService.getUnreadCount(user.id);
    return { count };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific notification by ID' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Notification details',
    type: Notification, // TODO DTO
  })
  async getNotification(
    @GetAuthUser() user: UserWithAccount,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Notification> {
    const notification = await this.notificationService.getNotification(id);

    // Ensure user can only access their own notifications (unless super admin)
    if (notification.userId !== user.id && !user.isSuperAdmin) {
      throw new UnauthorizedException(
        'You can only access your own notifications',
      );
    }

    return notification;
  }

  @Patch('mark-all-read')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Mark all notifications as read for the current user',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'All notifications marked as read',
  })
  async markAllAsRead(@GetAuthUser() user: UserWithAccount): Promise<void> {
    await this.notificationService.markAllAsRead(user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a notification (mark as read/unread)' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Notification updated successfully',
    type: Notification, // TODO DTO
  })
  async updateNotification(
    @GetAuthUser() user: UserWithAccount,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateNotificationDto: UpdateNotificationDto,
  ): Promise<Notification> {
    // First check if the notification belongs to the user
    const existingNotification =
      await this.notificationService.getNotification(id);

    if (existingNotification.userId !== user.id && !user.isSuperAdmin) {
      throw new UnauthorizedException(
        'You can only update your own notifications',
      );
    }

    return this.notificationService.updateNotification(
      id,
      updateNotificationDto,
    );
  }
}
