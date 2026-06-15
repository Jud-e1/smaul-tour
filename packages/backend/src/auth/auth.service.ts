import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { User, UserRole } from '../database/entities/user.entity';
import { UserProfile } from '../database/entities/user-profile.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { hashPassword, comparePassword } from './utils/password.util';
import { UserDto, AuthToken, UserProfileDto, OAuthUser } from './interfaces/auth.interfaces';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  // TODO: Production should use Redis with TTL instead of an in-memory Map
  private readonly resetTokenStore = new Map<string, { userId: string; expiresAt: Date }>();

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserProfile)
    private readonly userProfileRepository: Repository<UserProfile>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  async getMe(userId: string): Promise<UserDto> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['profile'],
    });
    if (!user) throw new UnauthorizedException('User not found');
    return this.mapToUserDto(user);
  }

  async register(dto: RegisterDto): Promise<{ user: UserDto; token: AuthToken }> {
    const existing = await this.userRepository.findOne({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await hashPassword(dto.password);

    const user = this.userRepository.create({
      email: dto.email,
      passwordHash,
      role: dto.role as UserRole,
      verified: false,
      locked: false,
      failedLoginAttempts: 0,
    });

    const savedUser = await this.userRepository.save(user);

    const profile = this.userProfileRepository.create({
      userId: savedUser.id,
      firstName: dto.firstName,
      lastName: dto.lastName,
      preferredCurrency: 'USD',
      preferredLanguage: 'en',
    });

    const savedProfile = await this.userProfileRepository.save(profile);
    savedUser.profile = savedProfile;

    await this.sendVerificationEmail(savedUser);

    const token = await this.generateTokens(savedUser);
    return { user: this.mapToUserDto(savedUser), token };
  }

  async login(dto: LoginDto): Promise<{ user: UserDto; token: AuthToken }> {
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
      relations: ['profile'],
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check lockout
    if (user.lockoutUntil && user.lockoutUntil > new Date()) {
      throw new ForbiddenException('Account is temporarily locked. Please try again later.');
    }

    // Reset lockout if expired
    if (user.locked && user.lockoutUntil && user.lockoutUntil <= new Date()) {
      user.locked = false;
      user.lockoutUntil = null;
      user.failedLoginAttempts = 0;
      await this.userRepository.save(user);
    }

    const passwordValid = await comparePassword(dto.password, user.passwordHash ?? '');

    if (!passwordValid) {
      user.failedLoginAttempts += 1;

      if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
        user.locked = true;
        user.lockoutUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
        this.logger.warn(
          `Account locked for user ${user.email} after ${MAX_FAILED_ATTEMPTS} failed attempts`
        );
      }

      await this.userRepository.save(user);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Successful login - reset counter
    user.failedLoginAttempts = 0;
    user.locked = false;
    user.lockoutUntil = null;
    await this.userRepository.save(user);

    const token = await this.generateTokens(user);

    return { user: this.mapToUserDto(user), token };
  }

  async loginWithOAuth(oauthUser: OAuthUser): Promise<{ user: UserDto; token: AuthToken }> {
    let user = await this.userRepository.findOne({
      where: { email: oauthUser.email },
      relations: ['profile'],
    });

    if (!user) {
      user = this.userRepository.create({
        email: oauthUser.email,
        role: UserRole.TRAVELER,
        verified: true,
        locked: false,
        failedLoginAttempts: 0,
      });
      user = await this.userRepository.save(user);

      const profile = this.userProfileRepository.create({
        userId: user.id,
        firstName: oauthUser.firstName,
        lastName: oauthUser.lastName,
        profilePhotoUrl: oauthUser.photo,
        preferredCurrency: 'USD',
        preferredLanguage: 'en',
      });
      user.profile = await this.userProfileRepository.save(profile);
    } else if (oauthUser.photo && user.profile) {
      user.profile.profilePhotoUrl = oauthUser.photo;
      user.profile = await this.userProfileRepository.save(user.profile);
    }

    const token = await this.generateTokens(user);
    return { user: this.mapToUserDto(user), token };
  }

  async sendVerificationEmail(user: User): Promise<void> {
    // Stub: actual email sending will be implemented in task 9
    this.logger.log(`[STUB] Sending verification email to ${user.email}`);
  }

  async generateTokens(user: User): Promise<AuthToken> {
    const secret = this.configService.get<string>(
      'JWT_SECRET',
      'default-secret-change-in-production'
    );
    const refreshSecret = this.configService.get<string>(
      'JWT_REFRESH_SECRET',
      'default-refresh-secret-change-in-production'
    );

    const accessToken = await this.jwtService.signAsync(
      { sub: user.id, email: user.email, role: user.role },
      { secret, expiresIn: '1h' }
    );

    const refreshToken = await this.jwtService.signAsync(
      { sub: user.id, type: 'refresh' },
      { secret: refreshSecret, expiresIn: '30d' }
    );

    return { accessToken, refreshToken, expiresIn: 3600, tokenType: 'Bearer' };
  }

  async refreshToken(refreshToken: string): Promise<AuthToken> {
    const refreshSecret = this.configService.get<string>(
      'JWT_REFRESH_SECRET',
      'default-refresh-secret-change-in-production'
    );

    let payload: { sub: string; type: string };
    try {
      payload = await this.jwtService.verifyAsync(refreshToken, { secret: refreshSecret });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
      relations: ['profile'],
    });

    if (!user || user.locked) {
      throw new UnauthorizedException('User not found or account is locked');
    }

    return this.generateTokens(user);
  }

  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      // Don't reveal whether the email exists
      return;
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    this.resetTokenStore.set(token, { userId: user.id, expiresAt });

    this.logger.log(`[STUB] Password reset link: /auth/reset?token=${token}`);
  }

  async changePassword(token: string, newPassword: string): Promise<void> {
    const entry = this.resetTokenStore.get(token);
    if (!entry || entry.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const user = await this.userRepository.findOne({ where: { id: entry.userId } });
    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    user.passwordHash = await hashPassword(newPassword);
    await this.userRepository.save(user);

    this.resetTokenStore.delete(token);
  }

  /**
   * Delete a user account by anonymizing personal data while retaining
   * anonymized transaction records for legal compliance.
   * Requirements: 16.8
   */
  async deleteAccount(userId: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['profile'],
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Anonymize profile data
    if (user.profile) {
      user.profile.firstName = null;
      user.profile.lastName = null;
      user.profile.profilePhotoUrl = null;
      user.profile.bio = null;
      user.profile.phone = null;
      user.profile.travelPreferences = null;
      await this.userProfileRepository.save(user.profile);
    }

    // Anonymize user email and clear password hash
    user.email = `deleted-${user.id}@deleted.invalid`;
    user.passwordHash = null;
    user.verified = false;
    user.locked = true;
    await this.userRepository.save(user);

    this.logger.log(`Account deleted (anonymized) for user ${userId}`);
  }

  mapToUserDto(user: User): UserDto {
    const profile = user.profile;
    const profileDto: UserProfileDto = profile
      ? {
          firstName: profile.firstName ?? '',
          lastName: profile.lastName ?? '',
          profilePhotoUrl: profile.profilePhotoUrl ?? undefined,
          bio: profile.bio ?? undefined,
          phone: profile.phone ?? undefined,
          preferredCurrency: profile.preferredCurrency ?? 'USD',
          preferredLanguage: profile.preferredLanguage ?? 'en',
          travelPreferences: profile.travelPreferences ?? undefined,
          guideVerificationStatus: profile.guideVerificationStatus as
            | 'pending'
            | 'approved'
            | 'rejected'
            | undefined,
        }
      : {
          firstName: '',
          lastName: '',
          preferredCurrency: 'USD',
          preferredLanguage: 'en',
        };

    return {
      id: user.id,
      email: user.email,
      role: user.role as 'traveler' | 'guide' | 'admin',
      verified: user.verified,
      locked: user.locked,
      profile: profileDto,
      createdAt: user.createdAt,
    };
  }
}
