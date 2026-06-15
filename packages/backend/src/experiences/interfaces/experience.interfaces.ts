export interface ExperienceLocation {
  address: string;
  latitude: number;
  longitude: number;
}

export interface Money {
  amount: number;
  currency: string;
}

export interface AvailabilitySlotDto {
  id?: string;
  date: string; // ISO date string "YYYY-MM-DD"
  startTime: string; // "HH:MM"
  endTime: string;
  capacity: number;
  booked: number;
  status: 'available' | 'booked' | 'blocked';
}

export interface AvailabilityCalendarDto {
  experienceId: string;
  slots: AvailabilitySlotDto[];
}

export interface ImageDto {
  id: string;
  url: string;
  thumbnailUrl: string;
  mediumUrl: string;
  originalFilename?: string;
  sizeBytes: number;
}

export interface ExperienceDto {
  id: string;
  guideId: string;
  title: string;
  description: string;
  location: ExperienceLocation;
  durationHours: number;
  price: Money;
  category: string[];
  images: ImageDto[];
  primaryImageId?: string;
  availability: AvailabilityCalendarDto;
  status: 'active' | 'inactive' | 'pending_approval';
  averageRating: number;
  reviewCount: number;
  cancellationPolicy: 'flexible' | 'moderate' | 'strict';
  createdAt: Date;
  updatedAt: Date;
}

export interface ExperienceSearchQuery {
  text?: string;
  categories?: string[];
  priceRange?: { min: number; max: number };
  durationRange?: { min: number; max: number };
  location?: { lat: number; lng: number; radiusKm: number };
  minRating?: number;
  sortBy?: 'price' | 'rating' | 'popularity';
  sortOrder?: 'asc' | 'desc';
  page: number;
  pageSize: number;
}

export interface ExperienceSearchResult {
  experiences: ExperienceDto[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateExperienceDto {
  title: string;
  description: string;
  locationAddress: string;
  locationLat: number;
  locationLng: number;
  durationHours: number;
  priceAmount: number;
  priceCurrency: string;
  category: string[];
  cancellationPolicy?: 'flexible' | 'moderate' | 'strict';
}

export interface UpdateExperienceDto extends Partial<CreateExperienceDto> {
  status?: 'active' | 'inactive';
}

/** Minimal representation of an uploaded file (compatible with Express.Multer.File) */
export interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Uint8Array;
  destination?: string;
  filename?: string;
  path?: string;
}

export interface IExperienceService {
  createExperience(guideId: string, dto: CreateExperienceDto): Promise<ExperienceDto>;
  updateExperience(id: string, guideId: string, dto: UpdateExperienceDto): Promise<ExperienceDto>;
  deleteExperience(id: string, guideId: string): Promise<void>;
  getExperience(id: string): Promise<ExperienceDto>;
  searchExperiences(query: ExperienceSearchQuery): Promise<ExperienceSearchResult>;
  uploadImage(experienceId: string, guideId: string, file: MulterFile): Promise<ImageDto>;
  setPrimaryImage(experienceId: string, guideId: string, imageId: string): Promise<void>;
  updateAvailability(
    experienceId: string,
    guideId: string,
    slots: AvailabilitySlotDto[]
  ): Promise<AvailabilityCalendarDto>;
  getRecommendations(experienceId: string, limit: number): Promise<ExperienceDto[]>;
}
