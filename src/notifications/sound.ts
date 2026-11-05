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
    label: 'Predefinito',
    description: 'Suono di sistema Android standard',
    icon: 'volume-high-outline',
  },
  {
    id: 'chime',
    label: 'Trillo dolce',
    description: 'Tono romantico e delicato',
    icon: 'musical-notes-outline',
  },
  {
    id: 'bell',
    label: 'Campanella',
    description: 'Suono limpido e squillante',
    icon: 'notifications-outline',
  },
  {
    id: 'pop',
    label: 'Bolle Pop',
    description: 'Tono giocoso e moderno',
    icon: 'chatbubble-ellipses-outline',
  },
  {
    id: 'silent',
    label: 'Solo vibrazione',
    description: 'Nessun suono udibile',
    icon: 'volume-mute-outline',
  },
];

const STORAGE_KEY = '@twocouple_notification_sound_v1';

export async function loadNotificationSound(): Promise<NotificationSoundId> {
  try {
    const sound = await AsyncStorage.getItem(STORAGE_KEY);
    if (sound && ['default', 'chime', 'bell', 'pop', 'silent'].includes(sound)) {
      return sound as NotificationSoundId;
    }
  } catch {
    // Fallback to default
  }
  return 'default';
}

export async function saveNotificationSound(sound: NotificationSoundId): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, sound);
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('messages', {
        name: 'Messages',
        importance: sound === 'silent' ? Notifications.AndroidImportance.LOW : Notifications.AndroidImportance.HIGH,
        vibrationPattern: sound === 'silent' ? [] : [0, 250, 250, 250],
        lightColor: '#0F766E',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        sound: sound === 'silent' ? null : 'default',
        enableVibrate: sound !== 'silent',
      });
    }
  } catch {
    // Best-effort
  }
}

export async function playSoundPreview(sound: NotificationSoundId): Promise<void> {
  if (sound === 'silent') {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    return;
  }
  if (sound === 'chime') {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } else if (sound === 'bell') {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  } else if (sound === 'pop') {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } else {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }
}
