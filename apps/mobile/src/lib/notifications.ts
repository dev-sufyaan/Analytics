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

export type PushRegistrationOutcome =
  | { ok: true; reason: 'granted' }
  | { ok: true; reason: 'granted_no_token'; warning: string }
  | { ok: false; reason: 'denied' }
  | { ok: false; reason: 'error'; warning: string };

/**
 * Result of the OS-level permission + device-token flow.
 *
 * IMPORTANT — do NOT gate the "Daily digest" UI toggle on the FCM token
 * being returned. The toggle is the user's *preference* and reflects the
 * OS-level grant; the FCM token is a best-effort delivery detail. If
 * `google-services.json` is not configured yet (which is common on a
 * freshly built APK), `getDevicePushTokenAsync` will throw or return an
 * empty token — the user has still granted permission and we should keep
 * their preference ON. The token registration is retried on every cold
 * start until it succeeds.
 */
export async function ensureNotificationPermissionAndChannel(): Promise<PushRegistrationOutcome> {
  if (Platform.OS !== 'android') {
    return { ok: true, reason: 'granted' };
  }

  try {
    await Notifications.setNotificationChannelAsync('daily_digest', {
      name: 'Daily Analytics Digest',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#c8f6f9',
      sound: 'default',
    });
  } catch (warn) {
    // Channel creation is best-effort.
  }

  // Check current permission state without prompting.
  const existing = (await Notifications.getPermissionsAsync()) as {
    granted?: boolean;
    status?: string;
    ios?: { status: number };
    android?: { status: number };
  };
  const platform: string = Platform.OS;
  const isGranted =
    existing?.granted === true ||
    existing?.status === 'granted' ||
    (platform === 'ios' && existing?.ios?.status === 2) ||
    (platform === 'android' && existing?.android?.status === 1);

  if (!isGranted) {
    // One-shot OS prompt. We never re-prompt on subsequent toggles — once
    // the user has answered, the OS handles the rest (Settings deep link).
    const requested = (await Notifications.requestPermissionsAsync()) as {
      granted?: boolean;
      status?: string;
      ios?: { status: number };
      android?: { status: number };
    };
    const afterRequest =
      requested?.granted === true ||
      requested?.status === 'granted' ||
      (platform === 'ios' && requested?.ios?.status === 2) ||
      (platform === 'android' && requested?.android?.status === 1);
    if (!afterRequest) {
      return { ok: false, reason: 'denied' };
    }
  }

  // Permission is granted. Now try to obtain the FCM token. This is the
  // step that requires `google-services.json` to be present in the APK
  // build; without it `getDevicePushTokenAsync` will throw. We catch
  // that case and report it as a soft warning so the UI keeps the toggle
  // ON — the user has done their part by granting permission.
  let fcmToken: string | null = null;
  try {
    const tokenData = await Notifications.getDevicePushTokenAsync();
    fcmToken = (tokenData as { data?: string } | undefined)?.data ?? null;
  } catch (err) {
    return {
      ok: true,
      reason: 'granted_no_token',
      warning:
        'Permission granted — push delivery will activate once Firebase is configured in the APK build.',
    };
  }

  if (!fcmToken) {
    return {
      ok: true,
      reason: 'granted_no_token',
      warning:
        'Permission granted — push delivery will activate once Firebase is configured in the APK build.',
    };
  }

  return { ok: true, reason: 'granted' };
}

/**
 * Registers device FCM push token with Supabase. Idempotent — safe to
 * re-run on every cold start. Returns the token on success or null on
 * any failure (caller must not treat null as "user denied permission";
 * use ensureNotificationPermissionAndChannel for that distinction).
 */
export async function registerForPushNotificationsAsync(
  userId: string
): Promise<string | null> {
  try {
    const tokenData = await Notifications.getDevicePushTokenAsync();
    const fcmToken = (tokenData as { data?: string } | undefined)?.data ?? null;
    if (!fcmToken) return null;

    const deviceId =
      Application.getAndroidId?.() ||
      `device_${userId.slice(0, 8)}`;

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
