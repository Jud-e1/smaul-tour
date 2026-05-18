import { Review } from '../../database/entities/review.entity';

// ─── Verification ────────────────────────────────────────────────────────────

export interface DocumentDto {
  id: string;
  type: string;
  url: string;
  uploadedAt: Date;
}

export interface VerificationRequestDto {
  id: string;
  guideId: string;
  documents: DocumentDto[];
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: Date;
  rejectionReason?: string;
  submittedAt: Date;
}

// ─── Metrics ─────────────────────────────────────────────────────────────────

export interface PlatformMetrics {
  totalUsers: number;
  totalGuides: number;
  totalTravelers: number;
  totalExperiences: number;
  totalBookings: number;
  totalRevenue: { amount: number; currency: string };
  averageBookingValue: { amount: number; currency: string };
  period: { start: Date; end: Date };
}

// ─── Audit Log ───────────────────────────────────────────────────────────────

export interface AuditLogDto {
  id: string;
  adminId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  changes: Record<string, any>;
  timestamp: Date;
}

// ─── Service Interface ────────────────────────────────────────────────────────

export interface IAdminService {
  getVerificationRequests(status?: string): Promise<VerificationRequestDto[]>;
  approveVerification(requestId: string, adminId: string): Promise<void>;
  rejectVerification(requestId: string, adminId: string, reason: string): Promise<void>;
  getFlaggedReviews(): Promise<Review[]>;
  suspendUser(userId: string, adminId: string, reason: string): Promise<void>;
  unsuspendUser(userId: string, adminId: string): Promise<void>;
  approveExperience(experienceId: string, adminId: string): Promise<void>;
  rejectExperience(experienceId: string, adminId: string, reason: string): Promise<void>;
  issueRefund(paymentId: string, adminId: string, reason: string): Promise<void>;
  getMetrics(startDate: Date, endDate: Date): Promise<PlatformMetrics>;
  getAuditLogs(filters?: { adminId?: string; startDate?: Date; endDate?: Date }): Promise<AuditLogDto[]>;
  updateTrustBadges(): Promise<void>;
}
