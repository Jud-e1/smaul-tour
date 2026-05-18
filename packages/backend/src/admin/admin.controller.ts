import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, CurrentUser } from '../auth/decorators/roles.decorator';
import { AdminService } from './admin.service';
import { RejectVerificationDto, GetVerificationRequestsQueryDto, RejectExperienceDto } from './dto/verification.dto';
import { SuspendUserDto } from './dto/suspend-user.dto';
import { MetricsQueryDto } from './dto/metrics-query.dto';
import { AdminRefundDto } from './dto/refund.dto';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ─── Verification Management ─────────────────────────────────────────────

  @Get('verification-requests')
  @ApiOperation({ summary: 'List guide verification requests (admin only)' })
  @ApiQuery({ name: 'status', required: false, enum: ['pending', 'approved', 'rejected'] })
  @ApiResponse({ status: 200, description: 'Verification requests returned' })
  getVerificationRequests(@Query() query: GetVerificationRequestsQueryDto) {
    return this.adminService.getVerificationRequests(query.status);
  }

  @Post('verification-requests/:id/approve')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Approve a guide verification request (admin only)' })
  @ApiParam({ name: 'id', description: 'Verification request ID' })
  @ApiResponse({ status: 204, description: 'Verification approved' })
  @ApiResponse({ status: 404, description: 'Request not found' })
  approveVerification(
    @Param('id') id: string,
    @CurrentUser() admin: { id: string },
  ) {
    return this.adminService.approveVerification(id, admin.id);
  }

  @Post('verification-requests/:id/reject')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Reject a guide verification request (admin only)' })
  @ApiParam({ name: 'id', description: 'Verification request ID' })
  @ApiResponse({ status: 204, description: 'Verification rejected' })
  @ApiResponse({ status: 404, description: 'Request not found' })
  rejectVerification(
    @Param('id') id: string,
    @Body() dto: RejectVerificationDto,
    @CurrentUser() admin: { id: string },
  ) {
    return this.adminService.rejectVerification(id, admin.id, dto.reason);
  }

  // ─── Experience Approval ──────────────────────────────────────────────────

  @Post('experiences/:id/approve')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Approve an experience listing (admin only)' })
  @ApiParam({ name: 'id', description: 'Experience ID' })
  @ApiResponse({ status: 204, description: 'Experience approved' })
  @ApiResponse({ status: 404, description: 'Experience not found' })
  approveExperience(
    @Param('id') id: string,
    @CurrentUser() admin: { id: string },
  ) {
    return this.adminService.approveExperience(id, admin.id);
  }

  @Post('experiences/:id/reject')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Reject an experience listing (admin only)' })
  @ApiParam({ name: 'id', description: 'Experience ID' })
  @ApiResponse({ status: 204, description: 'Experience rejected' })
  @ApiResponse({ status: 404, description: 'Experience not found' })
  rejectExperience(
    @Param('id') id: string,
    @Body() dto: RejectExperienceDto,
    @CurrentUser() admin: { id: string },
  ) {
    return this.adminService.rejectExperience(id, admin.id, dto.reason);
  }

  // ─── User Account Management ──────────────────────────────────────────────

  @Post('users/:id/suspend')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Suspend a user account (admin only)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 204, description: 'User suspended' })
  @ApiResponse({ status: 404, description: 'User not found' })
  suspendUser(
    @Param('id') id: string,
    @Body() dto: SuspendUserDto,
    @CurrentUser() admin: { id: string },
  ) {
    return this.adminService.suspendUser(id, admin.id, dto.reason);
  }

  @Post('users/:id/unsuspend')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unsuspend a user account (admin only)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 204, description: 'User unsuspended' })
  @ApiResponse({ status: 404, description: 'User not found' })
  unsuspendUser(
    @Param('id') id: string,
    @CurrentUser() admin: { id: string },
  ) {
    return this.adminService.unsuspendUser(id, admin.id);
  }

  // ─── Review Moderation ────────────────────────────────────────────────────

  @Get('reviews/flagged')
  @ApiOperation({ summary: 'Get all flagged reviews awaiting moderation (admin only)' })
  @ApiResponse({ status: 200, description: 'Flagged reviews returned' })
  getFlaggedReviews() {
    return this.adminService.getFlaggedReviews();
  }

  // ─── Refund Management ────────────────────────────────────────────────────

  @Post('refunds')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Issue an admin-initiated refund (admin only)' })
  @ApiResponse({ status: 204, description: 'Refund issued' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  issueRefund(
    @Body() dto: AdminRefundDto,
    @CurrentUser() admin: { id: string },
  ) {
    return this.adminService.issueRefund(dto.paymentId, admin.id, dto.reason);
  }

  // ─── Platform Metrics ─────────────────────────────────────────────────────

  @Get('metrics')
  @ApiOperation({ summary: 'Get platform metrics for a date range (admin only)' })
  @ApiQuery({ name: 'startDate', required: false, description: 'ISO date string (defaults to 30 days ago)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'ISO date string (defaults to now)' })
  @ApiResponse({ status: 200, description: 'Platform metrics returned' })
  getMetrics(@Query() query: MetricsQueryDto) {
    const endDate = query.endDate ? new Date(query.endDate) : new Date();
    const startDate = query.startDate
      ? new Date(query.startDate)
      : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // default: last 30 days
    return this.adminService.getMetrics(startDate, endDate);
  }

  // ─── Audit Logs ───────────────────────────────────────────────────────────

  @Get('audit-logs')
  @ApiOperation({ summary: 'Get admin audit logs (admin only)' })
  @ApiQuery({ name: 'adminId', required: false, description: 'Filter by admin user ID' })
  @ApiQuery({ name: 'startDate', required: false, description: 'ISO date string' })
  @ApiQuery({ name: 'endDate', required: false, description: 'ISO date string' })
  @ApiResponse({ status: 200, description: 'Audit logs returned' })
  getAuditLogs(
    @Query('adminId') adminId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.adminService.getAuditLogs({
      adminId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }
}
