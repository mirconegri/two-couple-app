import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { supabase } from '../lib/supabase';
import { EAS_PROJECT_ID } from '../lib/env';

export interface PushRegistrationResult {
  ok: boolean;
  reason?: string;
}

/**
 * Register this device for remote push.
 *
 * Push cannot be tested on an emulator, and remote notifications are not
 * supported in Expo Go from SDK 53 onward — a development or preview build
 * is required. Both conditions are reported honestly rather than swallowed.
 */
export async function registerForPushNotifications(
  coupleId: string,
  userId: string,
): Promise<PushRegistrationResult> {
  if (Platform.OS !== 'android') {
    return { ok: false, reason: 'This build targets Android only.' };
  }

  if (!Device.isDevice) {
    return { ok: false, reason: 'Push notifications need a physical device.' };
  }

  const projectId =
    EAS_PROJECT_ID ||
    (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas
      ?.projectId ||
    '';

  if (!projectId) {
    return {
      ok: false,
      reason: 'EAS project id is missing. Run "eas init" and set EAS_PROJECT_ID.',
    };
  }

  const permission = await Notifications.getPermissionsAsync();
  let granted = permission.granted;

  if (!granted && permission.canAskAgain) {
    const requested = await Notifications.requestPermissionsAsync();
    granted = requested.granted;
  }

  if (!granted) {
    return { ok: false, reason: 'Notification permission was not granted.' };
  }

  let token: string;
  try {
    const result = await Notifications.getExpoPushTokenAsync({ projectId });
    token = result.data;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error';
    return { ok: false, reason: `Could not obtain a push token: ${message}` };
  }

  const { error } = await supabase.from('push_tokens').upsert(
    {
      expo_token: token,
      user_id: userId,
      couple_id: coupleId,
      platform: 'android',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'expo_token' },
  );

  if (error) {
    return { ok: false, reason: `Could not register the token: ${error.message}` };
  }

  return { ok: true };
}

/** Remove this device's token — used when signing out or unlinking a phone. */
export async function unregisterPushToken(): Promise<void> {
  if (!Device.isDevice) return;

  const projectId =
    EAS_PROJECT_ID ||
    (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas
      ?.projectId ||
    '';
  if (!projectId) return;

  try {
    const result = await Notifications.getExpoPushTokenAsync({ projectId });
    await supabase.from('push_tokens').delete().eq('expo_token', result.data);
  } catch {
    // Best effort: a failure here must not block sign-out.
  }
}
