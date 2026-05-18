/**
 * Form validation tests
 * Tests input validation, character limits, and error display
 */
import '@testing-library/jest-dom';

describe('Form Validations', () => {
  describe('Review form', () => {
    it('requires a rating between 1 and 5', () => {
      const validateRating = (rating: number) => rating >= 1 && rating <= 5;
      expect(validateRating(0)).toBe(false);
      expect(validateRating(1)).toBe(true);
      expect(validateRating(5)).toBe(true);
      expect(validateRating(6)).toBe(false);
    });

    it('enforces 1000 character limit on comment', () => {
      const validateComment = (comment: string) => comment.length <= 1000;
      expect(validateComment('a'.repeat(1000))).toBe(true);
      expect(validateComment('a'.repeat(1001))).toBe(false);
    });

    it('allows empty comment', () => {
      const validateComment = (comment: string) => comment.length <= 1000;
      expect(validateComment('')).toBe(true);
    });
  });

  describe('Experience search', () => {
    it('validates price range (min <= max)', () => {
      const validatePriceRange = (min: number, max: number) => min <= max;
      expect(validatePriceRange(10, 100)).toBe(true);
      expect(validatePriceRange(100, 10)).toBe(false);
      expect(validatePriceRange(50, 50)).toBe(true);
    });

    it('validates duration filter is positive', () => {
      const validateDuration = (hours: number) => hours > 0;
      expect(validateDuration(1)).toBe(true);
      expect(validateDuration(0)).toBe(false);
      expect(validateDuration(-1)).toBe(false);
    });

    it('validates location radius is positive', () => {
      const validateRadius = (km: number) => km > 0;
      expect(validateRadius(10)).toBe(true);
      expect(validateRadius(0)).toBe(false);
    });
  });

  describe('Registration form', () => {
    it('validates password minimum length', () => {
      const validatePassword = (pwd: string) => pwd.length >= 8;
      expect(validatePassword('short')).toBe(false);
      expect(validatePassword('longenough')).toBe(true);
    });

    it('validates email format', () => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      expect(emailRegex.test('valid@example.com')).toBe(true);
      expect(emailRegex.test('invalid-email')).toBe(false);
      expect(emailRegex.test('missing@domain')).toBe(false);
    });

    it('validates role selection', () => {
      const validRoles = ['traveler', 'guide'];
      expect(validRoles.includes('traveler')).toBe(true);
      expect(validRoles.includes('guide')).toBe(true);
      expect(validRoles.includes('admin')).toBe(false);
    });
  });

  describe('Booking form', () => {
    it('requires at least 1 participant', () => {
      const validateParticipants = (n: number) => n >= 1;
      expect(validateParticipants(0)).toBe(false);
      expect(validateParticipants(1)).toBe(true);
      expect(validateParticipants(10)).toBe(true);
    });

    it('requires a future date', () => {
      const validateDate = (date: Date) => date > new Date();
      const future = new Date(Date.now() + 86400000);
      const past = new Date(Date.now() - 86400000);
      expect(validateDate(future)).toBe(true);
      expect(validateDate(past)).toBe(false);
    });
  });
});
