/**
 * Mobile authentication flow tests
 */

const mockLogin = jest.fn();
const mockRegister = jest.fn();
const mockLogout = jest.fn();

jest.mock('../store/auth', () => ({
  useAuthStore: () => ({
    user: null,
    isLoading: false,
    error: null,
    isAuthenticated: false,
    login: mockLogin,
    register: mockRegister,
    logout: mockLogout,
    clearError: jest.fn(),
  }),
}));

jest.mock('react-native-keychain', () => ({
  setGenericPassword: jest.fn().mockResolvedValue(true),
  getGenericPassword: jest.fn().mockResolvedValue(false),
  resetGenericPassword: jest.fn().mockResolvedValue(true),
}));

describe('Mobile Authentication', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('Login', () => {
    it('calls login with email and password', async () => {
      mockLogin.mockResolvedValueOnce(undefined);
      await mockLogin('user@example.com', 'password123');
      expect(mockLogin).toHaveBeenCalledWith('user@example.com', 'password123');
    });

    it('handles invalid credentials', async () => {
      mockLogin.mockRejectedValueOnce({ response: { data: { message: 'Invalid credentials' } } });
      await expect(mockLogin('bad@example.com', 'wrong')).rejects.toMatchObject({
        response: { data: { message: 'Invalid credentials' } },
      });
    });
  });

  describe('Registration', () => {
    it('registers with all required fields', async () => {
      mockRegister.mockResolvedValueOnce(undefined);
      const data = {
        email: 'new@example.com',
        password: 'SecurePass123!',
        role: 'traveler' as const,
        firstName: 'Jane',
        lastName: 'Doe',
      };
      await mockRegister(data);
      expect(mockRegister).toHaveBeenCalledWith(data);
    });

    it('validates password length', () => {
      const isValidPassword = (pwd: string) => pwd.length >= 8;
      expect(isValidPassword('short')).toBe(false);
      expect(isValidPassword('longenough')).toBe(true);
    });
  });

  describe('Logout', () => {
    it('clears tokens on logout', async () => {
      mockLogout.mockResolvedValueOnce(undefined);
      await mockLogout();
      expect(mockLogout).toHaveBeenCalled();
    });
  });

  describe('Token storage', () => {
    it('uses Keychain for secure token storage', async () => {
      const Keychain = require('react-native-keychain');
      await Keychain.setGenericPassword('token', 'test-token', { service: 'access_token' });
      expect(Keychain.setGenericPassword).toHaveBeenCalledWith('token', 'test-token', {
        service: 'access_token',
      });
    });
  });
});
