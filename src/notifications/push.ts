import Constants, { AppOwnership, ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { supabase } from '../lib/supabase';
import { EAS_PROJECT_ID } from '../lib/env';
import { type AppDatabase, setMeta } from '../db';

export interface PushRegistrationResult {
  ok: boolean;
  reason?: string;
}

export const PUSH_META_KEY = 'push_token_status';

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
  db?: AppDatabase,
): Promise<PushRegistrationResult> {
  const saveStatus = async (status: string) => {
    if (!db) return;
    try {
      await setMeta(db, PUSH_META_KEY, status);
    } catch {
      // Best effort
    }
  };

  if (Platform.OS !== 'android') {
    await saveStatus('This build targets Android only');
    return { ok: false, reason: 'This build targets Android only.' };
  }

  if (
    Constants.appOwnership === AppOwnership.Expo ||
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient
  ) {
    console.log(
      'Push tokens require a development build or standalone APK (not supported in Expo Go).',
    );
    await saveStatus('Not supported in Expo Go');
    return { ok: false, reason: 'Not supported in Expo Go' };
  }

  if (!Device.isDevice) {
    await saveStatus('Push notifications need a physical device');
    return { ok: false, reason: 'Push notifications need a physical device.' };
  }

  const projectId =
    EAS_PROJECT_ID ||
    (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas
      ?.projectId ||
    '';

  if (!projectId) {
    await saveStatus('EAS project ID missing');
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
    await saveStatus('Permission denied');
    return { ok: false, reason: 'Notification permission was not granted.' };
  }

  let token: string;
  try {
    const result = await Notifications.getExpoPushTokenAsync({ projectId });
    token = result.data;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error';
    await saveStatus(`Error: ${message}`);
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
    await saveStatus(`Error: ${error.message}`);
    return { ok: false, reason: `Could not register the token: ${error.message}` };
  }

  await saveStatus('Active (token registered)');
  return { ok: true };
}

/** Remove this device's token — used when signing out or unlinking a phone. */
export async function unregisterPushToken(db?: AppDatabase): Promise<void> {
  if (db) {
    try {
      await setMeta(db, PUSH_META_KEY, 'Not registered');
    } catch {
      // Best effort
    }
  }

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
