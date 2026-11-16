import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

export type NotificationSoundId = 'default' | 'chime' | 'bell' | 'pop' | 'silent';

export interface NotificationSoundOption {
  id: NotificationSoundId;
  label: string;
  description: string;
  icon: string;
}

export const NOTIFICATION_SOUNDS: NotificationSoundOption[] = [
  {
    id: 'default',
    label: 'System',
    description: 'The standard Android notification sound',
    icon: 'volume-high-outline',
  },
  {
    id: 'chime',
    label: 'Soft chime',
    description: 'Gentle two-tone ring',
    icon: 'musical-notes-outline',
  },
  {
    id: 'bell',
    label: 'Bell',
    description: 'Clear, bright bell',
    icon: 'notifications-outline',
  },
  {
    id: 'pop',
    label: 'Pop',
    description: 'Short and playful',
    icon: 'chatbubble-ellipses-outline',
  },
  {
    id: 'silent',
    label: 'Vibrate only',
    description: 'No audible sound',
    icon: 'volume-mute-outline',
  },
];

const STORAGE_KEY = '@twocouple_notification_sound_v1';

export async function loadNotificationSound(): Promise<NotificationSoundId> {
  try {
    const sound = await AsyncStorage.getItem(STORAGE_KEY);
    if (sound && NOTIFICATION_SOUNDS.some((option) => option.id === sound)) {
      return sound as NotificationSoundId;
    }
  } catch {
    // Fall back to the system sound.
  }
  return 'default';
}

export async function saveNotificationSound(sound: NotificationSoundId): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, sound);
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('messages', {
        name: 'Messages',
        importance:
          sound === 'silent'
            ? Notifications.AndroidImportance.LOW
            : Notifications.AndroidImportance.HIGH,
        vibrationPattern: sound === 'silent' ? [] : [0, 250, 250, 250],
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        sound: sound === 'silent' ? null : 'default',
        enableVibrate: sound !== 'silent',
      });
    }
  } catch {
    // Best-effort persistence.
  }
}

/** Each option is previewed with a distinct vibration because no audio files ship with the app. */
export async function playSoundPreview(
  sound: NotificationSoundId,
  hapticsEnabled: boolean,
): Promise<void> {
  if (!hapticsEnabled) return;

  if (sound === 'silent') {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    return;
  }
  if (sound === 'bell') {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    return;
  }
  if (sound === 'pop') {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    return;
  }
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}
