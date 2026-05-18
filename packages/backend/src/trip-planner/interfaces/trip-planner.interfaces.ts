export interface TripRequest {
  userId: string;
  naturalLanguageInput: string;
  timestamp: Date;
}

export interface BudgetRange {
  min: number;
  max: number;
  currency: string;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface TripParameters {
  duration?: number; // days
  budget?: BudgetRange;
  preferences: string[];
  activityTypes: string[];
  location?: string;
  dates?: DateRange;
}

export interface ExperienceRecommendation {
  experienceId: string;
  relevanceScore: number; // 0-1
  suggestedDate?: Date;
  reasoning: string;
}

export interface Money {
  amount: number;
  currency: string;
}

export interface Itinerary {
  id: string;
  userId: string;
  generatedAt: Date;
  experiences: ExperienceRecommendation[];
  totalCost: Money;
  parameters: TripParameters;
}

export interface ParseTripRequestDto {
  naturalLanguageInput: string;
}

export interface GenerateItineraryDto {
  parameters: TripParameters;
}

export interface ModifyItineraryDto {
  modification: string;
}

export interface IAITripPlannerService {
  parseRequest(request: TripRequest): Promise<TripParameters>;
  generateItinerary(userId: string, params: TripParameters): Promise<Itinerary>;
  modifyItinerary(itineraryId: string, userId: string, modification: string): Promise<Itinerary>;
  saveItinerary(itinerary: Itinerary): Promise<void>;
  getUserItineraries(userId: string): Promise<Itinerary[]>;
  getItinerary(id: string, userId: string): Promise<Itinerary>;
}
