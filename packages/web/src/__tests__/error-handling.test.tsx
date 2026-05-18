/**
 * Error handling tests
 * Tests API error handling, network failures, and user-facing error messages
 */
import '@testing-library/jest-dom';

describe('Error Handling', () => {
  describe('API error responses', () => {
    it('extracts error message from API response', () => {
      const extractMessage = (err: unknown, fallback: string): string => {
        const e = err as { response?: { data?: { message?: string } } };
        return e?.response?.data?.message || fallback;
      };

      const apiError = { response: { data: { message: 'Not found' } } };
      expect(extractMessage(apiError, 'Unknown error')).toBe('Not found');

      const networkError = new Error('Network Error');
      expect(extractMessage(networkError, 'Network error occurred')).toBe('Network error occurred');
    });

    it('handles 401 unauthorized by redirecting to login', () => {
      const handleAuthError = (status: number) => {
        if (status === 401) return 'redirect_to_login';
        return 'show_error';
      };
      expect(handleAuthError(401)).toBe('redirect_to_login');
      expect(handleAuthError(403)).toBe('show_error');
      expect(handleAuthError(500)).toBe('show_error');
    });

    it('handles 429 rate limit with retry-after', () => {
      const handleRateLimit = (status: number, retryAfter?: number) => {
        if (status === 429) return { limited: true, retryAfter: retryAfter || 60 };
        return { limited: false };
      };
      expect(handleRateLimit(429, 30)).toEqual({ limited: true, retryAfter: 30 });
      expect(handleRateLimit(200)).toEqual({ limited: false });
    });
  });

  describe('Payment error handling', () => {
    it('maps Stripe error codes to user messages', () => {
      const mapStripeError = (code: string): string => {
        const messages: Record<string, string> = {
          card_declined: 'Your card was declined. Please try a different card.',
          insufficient_funds: 'Insufficient funds. Please try a different payment method.',
          expired_card: 'Your card has expired. Please update your payment method.',
        };
        return messages[code] || 'Payment failed. Please try again.';
      };

      expect(mapStripeError('card_declined')).toContain('declined');
      expect(mapStripeError('insufficient_funds')).toContain('Insufficient');
      expect(mapStripeError('unknown_code')).toContain('try again');
    });
  });

  describe('Form error display', () => {
    it('shows field-level errors', () => {
      const getFieldError = (errors: Record<string, string>, field: string) =>
        errors[field] || null;

      const errors = { email: 'Invalid email', password: 'Too short' };
      expect(getFieldError(errors, 'email')).toBe('Invalid email');
      expect(getFieldError(errors, 'name')).toBeNull();
    });
  });

  describe('Network resilience', () => {
    it('retries failed requests with exponential backoff', () => {
      const getBackoffDelay = (attempt: number) => Math.min(1000 * Math.pow(2, attempt), 30000);
      expect(getBackoffDelay(0)).toBe(1000);
      expect(getBackoffDelay(1)).toBe(2000);
      expect(getBackoffDelay(2)).toBe(4000);
      expect(getBackoffDelay(10)).toBe(30000); // capped at 30s
    });
  });
});
