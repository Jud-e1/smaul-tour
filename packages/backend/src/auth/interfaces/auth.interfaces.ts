export interface UserProfileDto {
  firstName: string;
  lastName: string;
  profilePhotoUrl?: string;
  bio?: string;
  phone?: string;
  preferredCurrency: string;
  preferredLanguage: string;
  travelPreferences?: string[];
  guideVerificationStatus?: 'pending' | 'approved' | 'rejected';
}

export interface UserDto {
  id: string;
  email: string;
  role: 'traveler' | 'guide' | 'admin';
  verified: boolean;
  locked: boolean;
  profile: UserProfileDto;
  createdAt: Date;
}

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface OAuthCredentials {
  provider: 'google' | 'facebook';
  accessToken: string;
}

export interface OAuthUser {
  provider: string;
  providerId: string;
  email: string;
  firstName: string;
  lastName: string;
  photo?: string;
}

export interface AuthToken {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
  tokenType: 'Bearer';
}

export interface JwtPayload {
  sub: string; // user id
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}
