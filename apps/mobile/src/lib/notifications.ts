// apps/mobile/src/lib/notifications.ts
import * as Notifications from 'expo-notifications';
import * as Application from 'expo-application';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Configure foreground notification presentation handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Sets up Android notification channels and registers device FCM push token with Supabase.
 */
export async function registerForPushNotificationsAsync(
  userId: string
): Promise<string | null> {
  if (Platform.OS !== 'android') return null;

  try {
    // 1. Configure Android Notification Channels
    await Notifications.setNotificationChannelAsync('daily_digest', {
      name: 'Daily Analytics Digest',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#c8f6f9',
      sound: 'default',
    });

    // 2. Request Permissions
    const existingStatus = (await Notifications.getPermissionsAsync()) as {
      granted?: boolean;
      status?: string;
    };
    let isGranted = existingStatus?.granted || existingStatus?.status === 'granted';

    if (!isGranted) {
      const requested = (await Notifications.requestPermissionsAsync()) as {
        granted?: boolean;
        status?: string;
      };
      isGranted = requested?.granted || requested?.status === 'granted';
    }

    if (!isGranted) {
      return null;
    }

    // 3. Get Device Push Token (FCM v1 compatible token)
    const tokenData = await Notifications.getDevicePushTokenAsync();
    const fcmToken = tokenData.data;

    if (!fcmToken) return null;

    // 4. Unique Device Identifier
    const deviceId =
      Application.getAndroidId?.() ||
      `device_${userId.slice(0, 8)}`;

    // 5. Register in Supabase database
    const { error } = await supabase.from('push_tokens').upsert(
      {
        user_id: userId,
        device_id: deviceId,
        fcm_token: fcmToken,
        preferences: { daily_digest: true, milestones: false },
        last_seen: new Date().toISOString(),
      },
      { onConflict: 'user_id,device_id' }
    );

    if (error) {
      console.warn('Failed to upsert push token in Supabase:', error.message);
    }

    return fcmToken;
  } catch (err) {
    console.warn('Push registration error:', err);
    return null;
  }
}

/**
 * Updates user push notification preferences (e.g. daily digest toggle).
 */
export async function updateNotificationPreferences(
  userId: string,
  preferences: { daily_digest?: boolean; milestones?: boolean }
): Promise<boolean> {
  try {
    const deviceId =
      Application.getAndroidId?.() ||
      `device_${userId.slice(0, 8)}`;

    const { error } = await supabase
      .from('push_tokens')
      .update({
        preferences: preferences,
        last_seen: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('device_id', deviceId);

    return !error;
  } catch {
    return false;
  }
}
