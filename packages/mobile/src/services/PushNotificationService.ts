/**
 * Push Notification Service
 * Handles FCM (Android) and APNS (iOS) push notification setup and handling.
 * Requires @react-native-firebase/messaging and @react-native-community/push-notification-ios
 * to be installed and configured in the native projects.
 */

import { Platform, Alert } from 'react-native';
import api from '../lib/api';

// Type stubs for optional native modules
type FirebaseMessaging = {
  requestPermission: () => Promise<number>;
  getToken: () => Promise<string>;
  onMessage: (handler: (msg: RemoteMessage) => void) => () => void;
  onNotificationOpenedApp: (handler: (msg: RemoteMessage) => void) => () => void;
  getInitialNotification: () => Promise<RemoteMessage | null>;
  setBackgroundMessageHandler: (handler: (msg: RemoteMessage) => Promise<void>) => void;
};

interface RemoteMessage {
  notification?: { title?: string; body?: string };
  data?: Record<string, string>;
  messageId?: string;
}

let messaging: FirebaseMessaging | null = null;

// Lazy-load Firebase messaging to avoid crashes when native module isn't linked
const getMessaging = (): FirebaseMessaging | null => {
  if (messaging) return messaging;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    messaging = require('@react-native-firebase/messaging').default();
    return messaging;
  } catch {
    console.warn('Firebase messaging not available');
    return null;
  }
};

export class PushNotificationService {
  private static deviceToken: string | null = null;

  /**
   * Request notification permissions and register device token with backend.
   */
  static async initialize(userId: string): Promise<void> {
    const msg = getMessaging();
    if (!msg) return;

    try {
      const authStatus = await msg.requestPermission();
      const enabled = authStatus === 1 || authStatus === 2; // AUTHORIZED or PROVISIONAL

      if (!enabled) {
        console.log('Push notification permission denied');
        return;
      }

      const token = await msg.getToken();
      this.deviceToken = token;

      // Register token with backend
      await api
        .post(`/users/${userId}/device-tokens`, {
          token,
          platform: Platform.OS,
        })
        .catch(() => {});

      console.log('Push notification token registered:', token.substring(0, 20) + '...');
    } catch (err) {
      console.warn('Failed to initialize push notifications:', err);
    }
  }

  /**
   * Set up foreground message handler.
   * Returns unsubscribe function.
   */
  static onForegroundMessage(
    onNavigate: (screen: string, params?: Record<string, string>) => void
  ): () => void {
    const msg = getMessaging();
    if (!msg) return () => {};

    return msg.onMessage((remoteMessage: RemoteMessage) => {
      const { notification, data } = remoteMessage;
      if (!notification) return;

      Alert.alert(notification.title || 'Notification', notification.body || '', [
        { text: 'Dismiss', style: 'cancel' },
        {
          text: 'View',
          onPress: () => {
            if (data?.screen) {
              onNavigate(data.screen, data as Record<string, string>);
            }
          },
        },
      ]);
    });
  }

  /**
   * Handle notification tap when app is in background.
   * Returns unsubscribe function.
   */
  static onBackgroundNotificationTap(
    onNavigate: (screen: string, params?: Record<string, string>) => void
  ): () => void {
    const msg = getMessaging();
    if (!msg) return () => {};

    return msg.onNotificationOpenedApp((remoteMessage: RemoteMessage) => {
      const { data } = remoteMessage;
      if (data?.screen) {
        onNavigate(data.screen, data as Record<string, string>);
      }
    });
  }

  /**
   * Check if app was opened from a notification (cold start).
   */
  static async checkInitialNotification(
    onNavigate: (screen: string, params?: Record<string, string>) => void
  ): Promise<void> {
    const msg = getMessaging();
    if (!msg) return;

    const remoteMessage = await msg.getInitialNotification();
    if (remoteMessage?.data?.screen) {
      onNavigate(remoteMessage.data.screen, remoteMessage.data as Record<string, string>);
    }
  }

  /**
   * Set background message handler (must be called outside of React components).
   */
  static setBackgroundHandler(): void {
    const msg = getMessaging();
    if (!msg) return;

    msg.setBackgroundMessageHandler(async (remoteMessage: RemoteMessage) => {
      console.log('Background message received:', remoteMessage.messageId);
    });
  }

  static getDeviceToken(): string | null {
    return this.deviceToken;
  }
}

export default PushNotificationService;
