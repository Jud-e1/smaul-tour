export interface ReviewDto {
  id: string;
  bookingId: string;
  experienceId: string;
  travelerId: string;
  guideId: string;
  rating: number;
  comment?: string;
  status: 'published' | 'flagged' | 'removed';
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateReviewDto {
  bookingId: string;
  rating: number;
  comment?: string;
}

export interface ReviewListResult {
  reviews: ReviewDto[];
  total: number;
  page: number;
  pageSize: number;
}

export interface IReviewService {
  createReview(travelerId: string, dto: CreateReviewDto): Promise<ReviewDto>;
  getExperienceReviews(
    experienceId: string,
    page: number,
    pageSize: number
  ): Promise<ReviewListResult>;
  getGuideReviews(guideId: string): Promise<ReviewDto[]>;
  flagReview(reviewId: string, userId: string): Promise<void>;
  removeReview(reviewId: string, adminId: string): Promise<void>;
}
