import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from './auth.service';
import { User, UserRole } from '../database/entities/user.entity';
import { UserProfile } from '../database/entities/user-profile.entity';
import { RolesGuard } from './guards/roles.guard';
import * as passwordUtil from './utils/password.util';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-uuid-1',
    email: 'test@example.com',
    passwordHash: '$2b$12$hashedpassword',
    role: UserRole.TRAVELER,
    verified: false,
    locked: false,
    lockoutUntil: null,
    failedLoginAttempts: 0,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    profile: null,
    experiences: [],
    bookingsAsTraveler: [],
    bookingsAsGuide: [],
    reviews: [],
    notifications: [],
    ...overrides,
  } as User;
}

function makeProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    userId: 'user-uuid-1',
    firstName: 'John',
    lastName: 'Doe',
    profilePhotoUrl: null,
    bio: null,
    phone: null,
    preferredCurrency: 'USD',
    preferredLanguage: 'en',
    travelPreferences: [],
    guideVerificationStatus: null,
    updatedAt: new Date('2024-01-01'),
    user: null,
    ...overrides,
  } as UserProfile;
}

// ─── Password utilities ──────────────────────────────────────────────────────

describe('password utilities', () => {
  it('should hash a password with bcrypt', async () => {
    const hash = await passwordUtil.hashPassword('mySecret123');
    expect(hash).toBeDefined();
    expect(hash).not.toBe('mySecret123');
    expect(hash.startsWith('$2b$')).toBe(true);
  });

  it('should verify a correct password against its hash', async () => {
    const hash = await passwordUtil.hashPassword('correctPassword');
    const result = await passwordUtil.comparePassword('correctPassword', hash);
    expect(result).toBe(true);
  });

  it('should reject an incorrect password', async () => {
    const hash = await passwordUtil.hashPassword('correctPassword');
    const result = await passwordUtil.comparePassword('wrongPassword', hash);
    expect(result).toBe(false);
  });

  it('should produce different hashes for the same password (salt randomness)', async () => {
    const hash1 = await passwordUtil.hashPassword('samePassword');
    const hash2 = await passwordUtil.hashPassword('samePassword');
    expect(hash1).not.toBe(hash2);
  });
});

// ─── AuthService ─────────────────────────────────────────────────────────────

describe('AuthService', () => {
  let service: AuthService;

  const mockUserRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockUserProfileRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockJwtService = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('test-secret'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        { provide: getRepositoryToken(UserProfile), useValue: mockUserProfileRepository },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  // ─── register() ───────────────────────────────────────────────────────────

  describe('register', () => {
    const registerDto = {
      email: 'new@example.com',
      password: 'Password123!',
      firstName: 'Jane',
      lastName: 'Smith',
      role: 'traveler',
    };

    it('should create a new user and profile successfully', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      const savedUser = makeUser({ email: registerDto.email, id: 'new-uuid' });
      mockUserRepository.create.mockReturnValue(savedUser);
      mockUserRepository.save.mockResolvedValue(savedUser);
      const savedProfile = makeProfile({ userId: 'new-uuid', firstName: 'Jane', lastName: 'Smith' });
      mockUserProfileRepository.create.mockReturnValue(savedProfile);
      mockUserProfileRepository.save.mockResolvedValue(savedProfile);

      const result = await service.register(registerDto as any);

      expect(result.email).toBe(registerDto.email);
      expect(mockUserRepository.save).toHaveBeenCalledTimes(1);
      expect(mockUserProfileRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should throw ConflictException if email already exists', async () => {
      mockUserRepository.findOne.mockResolvedValue(makeUser());

      await expect(service.register(registerDto as any)).rejects.toThrow(ConflictException);
    });

    it('should hash the password before saving', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      const savedUser = makeUser({ email: registerDto.email });
      mockUserRepository.create.mockReturnValue(savedUser);
      mockUserRepository.save.mockResolvedValue(savedUser);
      mockUserProfileRepository.create.mockReturnValue(makeProfile());
      mockUserProfileRepository.save.mockResolvedValue(makeProfile());

      const hashSpy = jest.spyOn(passwordUtil, 'hashPassword');
      await service.register(registerDto as any);

      expect(hashSpy).toHaveBeenCalledWith(registerDto.password);
      const createdArg = mockUserRepository.create.mock.calls[0][0];
      expect(createdArg.passwordHash).not.toBe(registerDto.password);
    });

    it('should call sendVerificationEmail after registration', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      const savedUser = makeUser({ email: registerDto.email });
      mockUserRepository.create.mockReturnValue(savedUser);
      mockUserRepository.save.mockResolvedValue(savedUser);
      mockUserProfileRepository.create.mockReturnValue(makeProfile());
      mockUserProfileRepository.save.mockResolvedValue(makeProfile());

      const emailSpy = jest.spyOn(service, 'sendVerificationEmail').mockResolvedValue();
      await service.register(registerDto as any);

      expect(emailSpy).toHaveBeenCalledTimes(1);
    });
  });

  // ─── login() ──────────────────────────────────────────────────────────────

  describe('login', () => {
    const loginDto = { email: 'test@example.com', password: 'correctPassword' };

    beforeEach(() => {
      mockJwtService.signAsync.mockResolvedValue('mock-token');
    });

    it('should return user and token on valid credentials', async () => {
      const user = makeUser();
      mockUserRepository.findOne.mockResolvedValue(user);
      jest.spyOn(passwordUtil, 'comparePassword').mockResolvedValue(true);
      mockUserRepository.save.mockResolvedValue(user);

      const result = await service.login(loginDto as any);

      expect(result.user).toBeDefined();
      expect(result.token).toBeDefined();
      expect(result.token.tokenType).toBe('Bearer');
    });

    it('should throw UnauthorizedException for non-existent email', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.login(loginDto as any)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      const user = makeUser();
      mockUserRepository.findOne.mockResolvedValue(user);
      jest.spyOn(passwordUtil, 'comparePassword').mockResolvedValue(false);
      mockUserRepository.save.mockResolvedValue(user);

      await expect(service.login(loginDto as any)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw ForbiddenException when account is locked (lockoutUntil in future)', async () => {
      const future = new Date(Date.now() + 10 * 60 * 1000);
      const user = makeUser({ locked: true, lockoutUntil: future });
      mockUserRepository.findOne.mockResolvedValue(user);

      await expect(service.login(loginDto as any)).rejects.toThrow(ForbiddenException);
    });

    it('should increment failedLoginAttempts on wrong password', async () => {
      const user = makeUser({ failedLoginAttempts: 2 });
      mockUserRepository.findOne.mockResolvedValue(user);
      jest.spyOn(passwordUtil, 'comparePassword').mockResolvedValue(false);
      mockUserRepository.save.mockResolvedValue(user);

      await expect(service.login(loginDto as any)).rejects.toThrow(UnauthorizedException);

      const savedArg = mockUserRepository.save.mock.calls[0][0];
      expect(savedArg.failedLoginAttempts).toBe(3);
    });

    it('should lock account after 5 failed attempts', async () => {
      const user = makeUser({ failedLoginAttempts: 4 });
      mockUserRepository.findOne.mockResolvedValue(user);
      jest.spyOn(passwordUtil, 'comparePassword').mockResolvedValue(false);
      mockUserRepository.save.mockResolvedValue(user);

      await expect(service.login(loginDto as any)).rejects.toThrow(UnauthorizedException);

      const savedArg = mockUserRepository.save.mock.calls[0][0];
      expect(savedArg.locked).toBe(true);
      expect(savedArg.lockoutUntil).toBeDefined();
    });

    it('should reset failedLoginAttempts on successful login', async () => {
      const user = makeUser({ failedLoginAttempts: 3 });
      mockUserRepository.findOne.mockResolvedValue(user);
      jest.spyOn(passwordUtil, 'comparePassword').mockResolvedValue(true);
      mockUserRepository.save.mockResolvedValue(user);

      await service.login(loginDto as any);

      const savedArg = mockUserRepository.save.mock.calls[0][0];
      expect(savedArg.failedLoginAttempts).toBe(0);
    });

    it('should reset lockout if lockoutUntil has expired', async () => {
      const past = new Date(Date.now() - 1000);
      const user = makeUser({ locked: true, lockoutUntil: past, failedLoginAttempts: 5 });
      mockUserRepository.findOne.mockResolvedValue(user);
      jest.spyOn(passwordUtil, 'comparePassword').mockResolvedValue(true);
      mockUserRepository.save.mockResolvedValue(user);

      const result = await service.login(loginDto as any);

      expect(result.user).toBeDefined();
      // First save resets lockout, second save resets failed attempts after success
      const firstSave = mockUserRepository.save.mock.calls[0][0];
      expect(firstSave.locked).toBe(false);
    });
  });

  // ─── generateTokens() ─────────────────────────────────────────────────────

  describe('generateTokens', () => {
    it('should generate access and refresh tokens', async () => {
      mockJwtService.signAsync.mockResolvedValueOnce('access-token').mockResolvedValueOnce('refresh-token');
      const user = makeUser();

      const result = await service.generateTokens(user);

      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
    });

    it('should return correct token structure (accessToken, refreshToken, expiresIn: 3600, tokenType: Bearer)', async () => {
      mockJwtService.signAsync.mockResolvedValue('some-token');
      const user = makeUser();

      const result = await service.generateTokens(user);

      expect(result).toMatchObject({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        expiresIn: 3600,
        tokenType: 'Bearer',
      });
    });
  });

  // ─── refreshToken() ───────────────────────────────────────────────────────

  describe('refreshToken', () => {
    it('should return new tokens for a valid refresh token', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({ sub: 'user-uuid-1', type: 'refresh' });
      const user = makeUser();
      mockUserRepository.findOne.mockResolvedValue(user);
      mockJwtService.signAsync.mockResolvedValue('new-token');

      const result = await service.refreshToken('valid-refresh-token');

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      mockJwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));

      await expect(service.refreshToken('bad-token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for locked user', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({ sub: 'user-uuid-1', type: 'refresh' });
      const lockedUser = makeUser({ locked: true });
      mockUserRepository.findOne.mockResolvedValue(lockedUser);

      await expect(service.refreshToken('valid-token')).rejects.toThrow(UnauthorizedException);
    });
  });

  // ─── Account lockout mechanism ────────────────────────────────────────────

  describe('account lockout', () => {
    const loginDto = { email: 'test@example.com', password: 'wrongPassword' };

    it('should lock account after exactly 5 failed attempts', async () => {
      const user = makeUser({ failedLoginAttempts: 4 });
      mockUserRepository.findOne.mockResolvedValue(user);
      jest.spyOn(passwordUtil, 'comparePassword').mockResolvedValue(false);
      mockUserRepository.save.mockResolvedValue(user);

      await expect(service.login(loginDto as any)).rejects.toThrow(UnauthorizedException);

      const saved = mockUserRepository.save.mock.calls[0][0];
      expect(saved.failedLoginAttempts).toBe(5);
      expect(saved.locked).toBe(true);
    });

    it('should set lockoutUntil to approximately 15 minutes from now', async () => {
      const user = makeUser({ failedLoginAttempts: 4 });
      mockUserRepository.findOne.mockResolvedValue(user);
      jest.spyOn(passwordUtil, 'comparePassword').mockResolvedValue(false);
      mockUserRepository.save.mockResolvedValue(user);

      const before = Date.now();
      await expect(service.login(loginDto as any)).rejects.toThrow(UnauthorizedException);
      const after = Date.now();

      const saved = mockUserRepository.save.mock.calls[0][0];
      const lockoutMs = saved.lockoutUntil.getTime();
      const expectedMin = before + 14 * 60 * 1000;
      const expectedMax = after + 16 * 60 * 1000;
      expect(lockoutMs).toBeGreaterThanOrEqual(expectedMin);
      expect(lockoutMs).toBeLessThanOrEqual(expectedMax);
    });

    it('should unlock account when lockoutUntil has passed', async () => {
      const past = new Date(Date.now() - 1000);
      const user = makeUser({ locked: true, lockoutUntil: past, failedLoginAttempts: 5 });
      mockUserRepository.findOne.mockResolvedValue(user);
      jest.spyOn(passwordUtil, 'comparePassword').mockResolvedValue(true);
      mockJwtService.signAsync.mockResolvedValue('token');
      mockUserRepository.save.mockResolvedValue(user);

      const result = await service.login({ email: 'test@example.com', password: 'correctPassword' } as any);

      expect(result.user).toBeDefined();
    });
  });

  // ─── requestPasswordReset() & changePassword() ────────────────────────────

  describe('requestPasswordReset', () => {
    it('should return void without error for unknown email (silent fail)', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.requestPasswordReset('unknown@example.com')).resolves.toBeUndefined();
    });

    it('should store a reset token for known user', async () => {
      const user = makeUser();
      mockUserRepository.findOne.mockResolvedValue(user);

      await service.requestPasswordReset(user.email);

      // No error thrown and the internal store should have an entry (tested via changePassword)
    });
  });

  describe('changePassword', () => {
    it('should change password for valid token', async () => {
      const user = makeUser();
      mockUserRepository.findOne.mockResolvedValue(user);
      mockUserRepository.save.mockResolvedValue(user);

      // Seed a valid token by calling requestPasswordReset first
      mockUserRepository.findOne.mockResolvedValueOnce(user); // for requestPasswordReset
      await service.requestPasswordReset(user.email);

      // Grab the token from the internal store (access via any cast)
      const store: Map<string, { userId: string; expiresAt: Date }> = (service as any).resetTokenStore;
      const token = [...store.keys()][0];

      mockUserRepository.findOne.mockResolvedValue(user); // for changePassword
      await expect(service.changePassword(token, 'NewPassword123!')).resolves.toBeUndefined();
      expect(mockUserRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid token', async () => {
      await expect(service.changePassword('invalid-token', 'NewPassword123!')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for expired token', async () => {
      const user = makeUser();
      // Manually insert an expired token
      const store: Map<string, { userId: string; expiresAt: Date }> = (service as any).resetTokenStore;
      store.set('expired-token', { userId: user.id, expiresAt: new Date(Date.now() - 1000) });

      await expect(service.changePassword('expired-token', 'NewPassword123!')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});

// ─── RolesGuard ──────────────────────────────────────────────────────────────

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;

  function makeContext(user: any, requiredRoles: string[] | undefined): any {
    reflector.getAllAndOverride.mockReturnValue(requiredRoles);
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    };
  }

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() } as any;
    guard = new RolesGuard(reflector);
  });

  it('should allow access when no roles are required', () => {
    const ctx = makeContext({ role: 'traveler' }, undefined);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should allow access when user has the required role', () => {
    const ctx = makeContext({ role: 'admin' }, ['admin']);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should deny access when user does not have the required role', () => {
    const ctx = makeContext({ role: 'traveler' }, ['admin']);
    expect(guard.canActivate(ctx)).toBe(false);
  });

  it('should deny access when user is undefined', () => {
    const ctx = makeContext(undefined, ['admin']);
    expect(guard.canActivate(ctx)).toBe(false);
  });
});
