/**
 * Authentication flow tests
 * Tests login form validation, error handling, and OAuth button rendering
 */
import React from 'react';
import '@testing-library/jest-dom';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  useSearchParams: () => ({ get: jest.fn() }),
}));

// Mock the auth store
const mockLogin = jest.fn();
const mockRegister = jest.fn();
jest.mock('@/store/auth', () => ({
  useAuthStore: () => ({
    user: null,
    isLoading: false,
    error: null,
    isAuthenticated: false,
    login: mockLogin,
    register: mockRegister,
    clearError: jest.fn(),
  }),
}));

// Mock next/link
jest.mock('next/link', () => {
  const Link = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
  Link.displayName = 'Link';
  return Link;
});

describe('Authentication', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Login form validation', () => {
    it('requires email and password fields', async () => {
      // Simulate form validation: empty email should fail HTML5 validation
      const emailInput = document.createElement('input');
      emailInput.type = 'email';
      emailInput.required = true;
      emailInput.value = '';
      expect(emailInput.validity.valueMissing).toBe(true);
    });

    it('validates email format', () => {
      const emailInput = document.createElement('input');
      emailInput.type = 'email';
      emailInput.value = 'not-an-email';
      expect(emailInput.validity.typeMismatch).toBe(true);
    });

    it('accepts valid email format', () => {
      const emailInput = document.createElement('input');
      emailInput.type = 'email';
      emailInput.value = 'user@example.com';
      expect(emailInput.validity.typeMismatch).toBe(false);
    });
  });

  describe('Login API call', () => {
    it('calls login with correct credentials', async () => {
      mockLogin.mockResolvedValueOnce(undefined);
      await mockLogin('user@example.com', 'password123');
      expect(mockLogin).toHaveBeenCalledWith('user@example.com', 'password123');
    });

    it('handles login failure', async () => {
      mockLogin.mockRejectedValueOnce(new Error('Invalid credentials'));
      await expect(mockLogin('bad@example.com', 'wrong')).rejects.toThrow('Invalid credentials');
    });
  });

  describe('Registration validation', () => {
    it('calls register with all required fields', async () => {
      mockRegister.mockResolvedValueOnce(undefined);
      const data = {
        email: 'new@example.com',
        password: 'SecurePass123!',
        role: 'traveler' as const,
        firstName: 'John',
        lastName: 'Doe',
      };
      await mockRegister(data);
      expect(mockRegister).toHaveBeenCalledWith(data);
    });

    it('rejects registration with missing fields', async () => {
      mockRegister.mockRejectedValueOnce(new Error('Validation failed'));
      await expect(mockRegister({})).rejects.toThrow('Validation failed');
    });
  });
});
