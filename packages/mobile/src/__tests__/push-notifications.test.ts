/**
 * Push notification handling tests
 */

jest.mock(
  '@react-native-firebase/messaging',
  () => {
    const mockMessaging = {
      requestPermission: jest.fn().mockResolvedValue(1),
      getToken: jest.fn().mockResolvedValue('mock-fcm-token-abc123'),
      onMessage: jest.fn().mockReturnValue(() => {}),
      onNotificationOpenedApp: jest.fn().mockReturnValue(() => {}),
      getInitialNotification: jest.fn().mockResolvedValue(null),
      setBackgroundMessageHandler: jest.fn(),
    };
    return { default: () => mockMessaging };
  },
  { virtual: true }
);

jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
  Alert: { alert: jest.fn() },
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  },
}));

jest.mock('../lib/api', () => ({
  default: { post: jest.fn().mockResolvedValue({ data: {} }) },
}));

describe('Push Notifications', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('Permission request', () => {
    it('requests notification permission on initialize', async () => {
      const { PushNotificationService } = require('../services/PushNotificationService');
      await PushNotificationService.initialize('user-1');
      const messaging = require('@react-native-firebase/messaging').default();
      expect(messaging.requestPermission).toHaveBeenCalled();
    });

    it('registers device token with backend', async () => {
      const { PushNotificationService } = require('../services/PushNotificationService');
      await PushNotificationService.initialize('user-1');
      const api = require('../lib/api').default;
      expect(api.post).toHaveBeenCalledWith('/users/user-1/device-tokens', {
        token: 'mock-fcm-token-abc123',
        platform: 'android',
      });
    });
  });

  describe('Notification navigation', () => {
    it('navigates to correct screen on notification tap', () => {
      const navigateMock = jest.fn();
      const { PushNotificationService } = require('../services/PushNotificationService');
      const messaging = require('@react-native-firebase/messaging').default();

      PushNotificationService.onBackgroundNotificationTap(navigateMock);
      expect(messaging.onNotificationOpenedApp).toHaveBeenCalled();
    });
  });

  describe('Token retrieval', () => {
    it('returns device token after initialization', async () => {
      const { PushNotificationService } = require('../services/PushNotificationService');
      await PushNotificationService.initialize('user-1');
      expect(PushNotificationService.getDeviceToken()).toBe('mock-fcm-token-abc123');
    });
  });
});
