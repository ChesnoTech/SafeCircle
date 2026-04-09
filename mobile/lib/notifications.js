import { Platform } from 'react-native';
import { registerFcmToken } from './api';
import { CONFIG } from './config';

const isNative = Platform.OS !== 'web';

// Lazy-load native modules only on iOS/Android
let Notifications = null;
let Device = null;

if (isNative) {
  Notifications = require('expo-notifications');
  Device = require('expo-device');

  // Configure notification behavior
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

/**
 * Request push notification permissions and register FCM token with backend.
 * Returns the push token string or null if denied/unavailable.
 */
export async function registerForPushNotifications(language = CONFIG.DEFAULT_LANGUAGE) {
  if (!isNative || !Device.isDevice) {
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  // Android notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('critical_alerts', {
      name: 'Critical Alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: CONFIG.COLORS.primary,
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
    });
  }

  const tokenData = await Notifications.getExpoPushTokenAsync();
  const pushToken = tokenData.data;

  // Register with backend
  const platform = Platform.OS === 'ios' ? 'ios' : 'android';
  try {
    await registerFcmToken(pushToken, platform, language);
  } catch (err) {
    // Silently fail — user might not be logged in yet
  }

  return pushToken;
}

/**
 * Add a listener for foreground notifications (when app is open).
 * Returns a subscription that must be removed on cleanup.
 */
export function onNotificationReceived(callback) {
  if (!isNative) return { remove: () => {} };
  return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Add a listener for when user taps a notification.
 * Returns a subscription that must be removed on cleanup.
 */
export function onNotificationTapped(callback) {
  if (!isNative) return { remove: () => {} };
  return Notifications.addNotificationResponseReceivedListener(callback);
}

/**
 * Get the last notification that opened the app (cold start).
 */
export async function getLastNotificationResponse() {
  if (!isNative) return null;
  return Notifications.getLastNotificationResponseAsync();
}

/**
 * Set the badge count (iOS).
 */
export async function setBadgeCount(count) {
  if (!isNative) return;
  await Notifications.setBadgeCountAsync(count);
}
