export interface BookingDto {
  id: string;
  referenceNumber: string;
  travelerId: string;
  experienceId: string;
  guideId: string;
  date: string;
  startTime: string;
  endTime: string;
  participants: number;
  totalAmount: number;
  totalCurrency: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'refunded';
  cancellationPolicy: 'flexible' | 'moderate' | 'strict';
  paymentId?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
}

export interface BookingRequest {
  travelerId: string;
  experienceId: string;
  date: string; // ISO date string "YYYY-MM-DD"
  startTime: string; // "HH:MM"
  participants: number;
  idempotencyKey?: string;
}

export interface CancellationRequest {
  bookingId: string;
  userId: string;
  userRole: 'traveler' | 'guide' | 'admin';
  reason: string;
}

export interface CancellationResult {
  success: boolean;
  refundAmount: number;
  refundCurrency: string;
  refundPercentage: number;
  message: string;
}

export interface BookingListFilters {
  status?: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'refunded';
  groupBy?: 'upcoming' | 'past' | 'cancelled';
}

export interface BookingService {
  createBooking(request: BookingRequest): Promise<BookingDto>;
  getBooking(id: string): Promise<BookingDto>;
  getUserBookings(userId: string, filters?: BookingListFilters): Promise<BookingDto[]>;
  getGuideBookings(guideId: string, filters?: BookingListFilters): Promise<BookingDto[]>;
  cancelBooking(request: CancellationRequest): Promise<CancellationResult>;
  completeBooking(bookingId: string): Promise<BookingDto>;
  checkAvailability(experienceId: string, date: string, startTime: string): Promise<boolean>;
}
