import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  UseGuards,
  Request,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';
import { INotificationPreferences } from './interfaces/notification.interfaces';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get user notifications' })
  async getUserNotifications(
    @Request() req: { user: { id: string } },
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) _page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) _limit: number
  ) {
    return this.notificationsService.getUserNotifications(req.user.id);
  }

  @Put(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  async markAsRead(@Param('id') id: string) {
    await this.notificationsService.markAsRead(id);
    return { success: true };
  }
}

@ApiTags('notification-preferences')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UserNotificationPreferencesController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get(':id/notification-preferences')
  @ApiOperation({ summary: 'Get notification preferences' })
  async getPreferences(@Param('id') userId: string) {
    return this.notificationsService.getPreferences(userId);
  }

  @Put(':id/notification-preferences')
  @ApiOperation({ summary: 'Update notification preferences' })
  async updatePreferences(
    @Param('id') userId: string,
    @Body() preferences: Partial<INotificationPreferences>
  ) {
    return this.notificationsService.updatePreferences(userId, preferences);
  }
}
