import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('bookings')
@Controller('bookings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('traveler')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new booking (traveler only)' })
  @ApiResponse({ status: 201, description: 'Booking created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request or slot not available' })
  @ApiResponse({ status: 409, description: 'Slot is fully booked or concurrent booking conflict' })
  async create(@Req() req: any, @Body() dto: CreateBookingDto) {
    return this.bookingsService.createBooking({
      travelerId: req.user.id,
      experienceId: dto.experienceId,
      date: dto.date,
      startTime: dto.startTime,
      participants: dto.participants,
      idempotencyKey: dto.idempotencyKey,
    });
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a booking by ID' })
  @ApiResponse({ status: 200, description: 'Booking found' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async getOne(@Param('id') id: string) {
    return this.bookingsService.getBooking(id);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a booking' })
  @ApiResponse({ status: 200, description: 'Booking cancelled with refund details' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  @ApiResponse({ status: 409, description: 'Booking cannot be cancelled' })
  async cancel(@Param('id') id: string, @Req() req: any, @Body() dto: CancelBookingDto) {
    return this.bookingsService.cancelBooking({
      bookingId: id,
      userId: req.user.id,
      userRole: req.user.role,
      reason: dto.reason,
    });
  }

  @Post(':id/complete')
  @UseGuards(RolesGuard)
  @Roles('guide', 'admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a booking as completed (guide or admin only)' })
  @ApiResponse({ status: 200, description: 'Booking marked as completed' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  @ApiResponse({ status: 409, description: 'Booking is not in confirmed status' })
  async complete(@Param('id') id: string) {
    return this.bookingsService.completeBooking(id);
  }
}

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UserBookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get(':id/bookings')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get a user's bookings with optional filters" })
  @ApiResponse({ status: 200, description: 'Bookings returned' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['pending', 'confirmed', 'completed', 'cancelled', 'refunded'],
  })
  @ApiQuery({ name: 'groupBy', required: false, enum: ['upcoming', 'past', 'cancelled'] })
  async getUserBookings(
    @Param('id') id: string,
    @Query('status') status?: string,
    @Query('groupBy') groupBy?: string
  ) {
    return this.bookingsService.getUserBookings(id, {
      status: status as any,
      groupBy: groupBy as any,
    });
  }
}

@ApiTags('guides')
@Controller('guides')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GuideBookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get(':id/bookings')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get a guide's bookings with optional filters" })
  @ApiResponse({ status: 200, description: 'Bookings returned' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['pending', 'confirmed', 'completed', 'cancelled', 'refunded'],
  })
  @ApiQuery({ name: 'groupBy', required: false, enum: ['upcoming', 'past', 'cancelled'] })
  async getGuideBookings(
    @Param('id') id: string,
    @Query('status') status?: string,
    @Query('groupBy') groupBy?: string
  ) {
    return this.bookingsService.getGuideBookings(id, {
      status: status as any,
      groupBy: groupBy as any,
    });
  }
}
