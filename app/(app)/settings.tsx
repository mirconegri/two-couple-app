import React, { useEffect, useState } from 'react';
import { Alert, Image, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import * as Notifications from 'expo-notifications';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';

import { Screen } from '../../src/components/Screen';
import { ListSection } from '../../src/components/ListSection';
import { ListRow } from '../../src/components/ListRow';
import { Text } from '../../src/components/Text';
import { TopAppBar } from '../../src/components/TopAppBar';
import { PickerRow } from '../../src/components/PickerRow';
import { SwitchRow } from '../../src/components/SwitchRow';
import { Chip } from '../../src/components/Chip';
import { PressableScale } from '../../src/components/PressableScale';
import { useAuth } from '../../src/auth/AuthProvider';
import { useSync } from '../../src/sync/SyncProvider';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useWallpaper } from '../../src/theme/WallpaperProvider';
import { WALLPAPER_PRESETS } from '../../src/theme/wallpaper';
import { seedPalette, shape, spacing } from '../../src/theme/tokens';
import { useSettings } from '../../src/settings/SettingsProvider';
import { TEXT_SCALE_OPTIONS } from '../../src/settings/types';
import {
  loadNotificationSound,
  saveNotificationSound,
  playSoundPreview,
  NOTIFICATION_SOUNDS,
  type NotificationSoundId,
} from '../../src/notifications/sound';
import { clearLocalData, getMeta } from '../../src/db';
import { registerForPushNotifications, unregisterPushToken } from '../../src/notifications/push';
import { ensureNotificationPermission } from '../../src/notifications/reminders';
import { errorMessage } from '../../src/utils/errors';
import type { CalendarView, ChatDensity, ThemeMode } from '../../src/settings/types';
import type { WeekStart } from '../../src/utils/date';

const THEME_OPTIONS: Array<{ value: ThemeMode; label: string }> = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

const WEEK_START_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '1', label: 'Monday' },
  { value: '0', label: 'Sunday' },
  { value: '6', label: 'Saturday' },
];

const BUBBLE_SHAPES: Array<{ value: 'expressive' | 'rounded' | 'square'; label: string }> = [
  { value: 'expressive', label: 'Expressive' },
  { value: 'rounded', label: 'Rounded' },
  { value: 'square', label: 'Square' },
];

const DENSITY_OPTIONS: Array<{ value: ChatDensity; label: string }> = [
  { value: 'cozy', label: 'Cozy' },
  { value: 'compact', label: 'Compact' },
];

const TEXT_SCALE_LABELS: Record<number, string> = {
  0.85: 'Small',
  1: 'Default',
  1.15: 'Large',
  1.3: 'Largest',
};

const CALENDAR_VIEW_OPTIONS: Array<{ value: CalendarView; label: string }> = [
  { value: 'month', label: 'Month' },
  { value: 'agenda', label: 'Agenda' },
];

const WALLPAPER_SCOPE_OPTIONS: Array<{ value: 'chat' | 'all'; label: string }> = [
  { value: 'chat', label: 'Chat only' },
  { value: 'all', label: 'Whole app' },
];

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const { colors } = useTheme();
  const { settings, update } = useSettings();
  const { email, userId, coupleId, members, signOut, refreshCouple } = useAuth();
  const { pendingCount, realtimeStatus, lastSyncedAt, syncing, syncNow } = useSync();
  const { prefs: wallpaperPrefs, setPreset, setCustomPhoto, setScope, resetToDefault } = useWallpaper();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pushStatus, setPushStatus] = useState('Checking…');
  const [selectedSound, setSelectedSound] = useState<NotificationSoundId>('default');

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  useEffect(() => {
    void getMeta(db, 'push_token_status').then((value) => setPushStatus(value || 'Not registered'));
    void loadNotificationSound().then(setSelectedSound);
  }, [db]);

  const handleSelectSound = async (soundId: NotificationSoundId) => {
    setSelectedSound(soundId);
    await saveNotificationSound(soundId);
    void playSoundPreview(soundId, settings.haptics);
  };

  const handlePickCustomWallpaper = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow gallery access to use one of your photos as a background.');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.85,
      });
      const asset = result.assets?.[0];
      if (!result.canceled && asset?.uri) await setCustomPhoto(asset.uri);
    } catch {
      Alert.alert('Could not open the gallery', 'Try again, or pick a different photo.');
    }
  };

  const me = members.find((member) => member.userId === userId);
  const partner = members.find((member) => member.userId !== userId);

  const handleSync = async () => {
    setBusy(true);
    const result = await syncNow();
    setError(result?.error ?? null);
    setBusy(false);
  };

  const handleSignOut = () => {
    Alert.alert('Sign out?', 'Your local data stays on this phone until you clear it.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            await unregisterPushToken(db);
            await signOut();
          })();
        },
      },
    ]);
  };

  const handleClearData = () => {
    Alert.alert(
      'Delete local data?',
      'Messages and events cached on this phone will be removed. Anything not yet synced will be lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await clearLocalData(db);
                await refreshCouple(db);
              } catch (caught) {
                setError(errorMessage(caught));
              }
            })();
          },
        },
      ],
    );
  };

  const handleTestNotification = async () => {
    try {
      if (!(await ensureNotificationPermission())) {
        Alert.alert('Permission needed', 'Enable notifications for Two in the system settings.');
        return;
      }
      await Notifications.scheduleNotificationAsync({
        content: { title: 'Two', body: 'Notifications are working.', sound: 'default' },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes?.DATE ?? 'date',
          date: new Date(Date.now() + 3000),
          channelId: 'messages',
        },
      });
      Alert.alert('Test scheduled', 'A notification will appear in 3 seconds.');
    } catch (caught) {
      Alert.alert('Test failed', errorMessage(caught));
    }
  };

  const handleRegisterPush = async () => {
    if (!coupleId || !userId) return;
    setBusy(true);
    setPushStatus('Registering…');
    const result = await registerForPushNotifications(coupleId, userId, db);
    const updated = await getMeta(db, 'push_token_status');
    setPushStatus(updated || (result.ok ? 'Active' : result.reason || 'Failed'));
    setBusy(false);
  };

  return (
    <>
      <TopAppBar title="Settings" scrollY={scrollY} onBack={() => router.back()} />

      <Screen scroll onScroll={scrollHandler} contentStyle={styles.content}>
        <ListSection title="Your space">
          <ListRow
            icon="person"
            title="Your name"
            value={me?.displayName ?? 'Not set'}
            chevron
            onPress={() => router.push('/(app)/profile')}
          />
          <ListRow icon="mail" title="Signed in as" value={email ?? '—'} />
          <ListRow
            icon="heart"
            title="Your space"
            value={coupleId ? 'Active' : 'Not set up'}
          />
          <ListRow
            icon="people"
            title="Partner"
            value={partner ? partner.displayName || 'Joined' : 'Waiting to join'}
          />
          {members.length < 2 ? (
            <ListRow
              icon="person-add"
              title="Invite your partner"
              chevron
              onPress={() => router.push('/(app)/invite')}
            />
          ) : null}
        </ListSection>

        <ListSection title="Appearance">
          <PickerRow
            icon="brush-outline"
            title="Theme"
            options={THEME_OPTIONS}
            value={settings.themeMode}
            onChange={(themeMode) => update({ themeMode })}
          />

          <SwitchRow
            icon="color-palette-outline"
            title="Dynamic colour"
            supporting="Follow the wallpaper palette on Android 12 and newer"
            value={settings.dynamicColor}
            onChange={(dynamicColor) => update({ dynamicColor })}
          />

          <SwitchRow
            icon="contrast-outline"
            title="Pure black in dark mode"
            supporting="Use true black surfaces on OLED screens"
            value={settings.amoledBlack}
            onChange={(amoledBlack) => update({ amoledBlack })}
          />
        </ListSection>

        <ListSection
          title="Accent colour"
          footer={
            settings.dynamicColor
              ? 'Dynamic colour is on, so this accent applies when the device has no palette of its own.'
              : 'Used to build the whole palette.'
          }
        >
          <View style={styles.swatches}>
            {seedPalette.map((seed) => {
              const selected = settings.seedColor === seed.value;
              return (
                <PressableScale
                  key={seed.value}
                  onPress={() => update({ seedColor: seed.value })}
                  haptics="selection"
                  scaleTo={0.88}
                  accessibilityRole="button"
                  accessibilityLabel={seed.name}
                  accessibilityState={{ selected }}
                  style={[
                    styles.accentSwatch,
                    {
                      backgroundColor: seed.value,
                      borderColor: selected ? colors.onSurface : colors.outlineVariant,
                      borderWidth: selected ? 3 : 1,
                    },
                  ]}
                >
                  {selected ? (
                    <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                  ) : null}
                </PressableScale>
              );
            })}
          </View>
        </ListSection>

        <ListSection>
          <PickerRow
            icon="text-outline"
            title="Text size"
            supporting="Scales every label in the app"
            options={TEXT_SCALE_OPTIONS.map((option) => ({
              value: String(option),
              label: TEXT_SCALE_LABELS[option] ?? String(option),
            }))}
            value={String(settings.textScale)}
            onChange={(value) => update({ textScale: Number(value) })}
          />
        </ListSection>

        <ListSection title="Chat">
          <PickerRow
            icon="chatbubble-ellipses-outline"
            title="Bubble shape"
            options={BUBBLE_SHAPES}
            value={settings.bubbleShape}
            onChange={(bubbleShape) => update({ bubbleShape })}
          />

          <PickerRow
            icon="resize-outline"
            title="Spacing"
            options={DENSITY_OPTIONS}
            value={settings.chatDensity}
            onChange={(chatDensity) => update({ chatDensity })}
          />
        </ListSection>

        <ListSection title="Calendar">
          <PickerRow
            icon="calendar-outline"
            title="Week starts on"
            options={WEEK_START_OPTIONS}
            value={String(settings.calendarStartDay)}
            onChange={(value) => update({ calendarStartDay: Number(value) as WeekStart })}
          />

          <PickerRow
            icon="albums-outline"
            title="Opens in"
            options={CALENDAR_VIEW_OPTIONS}
            value={settings.calendarDefaultView}
            onChange={(calendarDefaultView) => update({ calendarDefaultView })}
          />

          <SwitchRow
            icon="time-outline"
            title="24-hour time"
            value={settings.use24Hour}
            onChange={(use24Hour) => update({ use24Hour })}
          />
        </ListSection>

        <ListSection title="Feel">
          <SwitchRow
            icon="phone-portrait-outline"
            title="Haptics"
            supporting="Short vibrations on taps and actions"
            value={settings.haptics}
            onChange={(hapticsEnabled) => update({ haptics: hapticsEnabled })}
          />
          <SwitchRow
            icon="sparkles-outline"
            title="Animations"
            supporting="Turn off to follow the system reduce-motion setting everywhere"
            value={settings.motion}
            onChange={(motion) => update({ motion })}
          />
        </ListSection>

        <ListSection title="Background" footer="Patterns take their colour from the current palette.">
          <PickerRow
            icon="phone-portrait-outline"
            title="Apply to"
            options={WALLPAPER_SCOPE_OPTIONS}
            value={wallpaperPrefs.scope}
            onChange={(scope) => void setScope(scope)}
          />

          <View style={styles.padded}>
            <Text variant="bodyMedium" color="onSurfaceVariant" style={styles.label}>
              Pattern
            </Text>
            <View style={styles.patterns}>
              {WALLPAPER_PRESETS.map((preset) => {
                const selected = wallpaperPrefs.id === preset.id;
                return (
                  <PressableScale
                    key={preset.id}
                    onPress={() => void setPreset(preset.id)}
                    haptics="selection"
                    scaleTo={0.94}
                    accessibilityRole="button"
                    accessibilityLabel={preset.title}
                    accessibilityState={{ selected }}
                    style={[
                      styles.pattern,
                      {
                        backgroundColor: selected
                          ? colors.secondaryContainer
                          : colors.surfaceContainerHighest,
                        borderColor: selected ? colors.primary : 'transparent',
                      },
                    ]}
                  >
                    <Ionicons
                      name={preset.icon as keyof typeof Ionicons.glyphMap}
                      size={22}
                      color={selected ? colors.onSecondaryContainer : colors.onSurfaceVariant}
                    />
                    <Text
                      variant="labelMedium"
                      numberOfLines={1}
                      style={{
                        color: selected ? colors.onSecondaryContainer : colors.onSurfaceVariant,
                        marginTop: spacing.xs,
                      }}
                    >
                      {preset.title}
                    </Text>
                  </PressableScale>
                );
              })}
            </View>
          </View>

          {wallpaperPrefs.id === 'custom' && wallpaperPrefs.customUri ? (
            <View style={styles.photo}>
              <Image
                source={{ uri: wallpaperPrefs.customUri }}
                style={[styles.photoPreview, { borderColor: colors.primary }]}
                resizeMode="cover"
              />
              <Text variant="bodySmall" color="onSurfaceVariant">
                Your photo is active
              </Text>
              <Chip label="Remove photo" icon="trash-outline" onPress={() => void resetToDefault()} />
            </View>
          ) : null}

          <ListRow
            icon="image"
            title="Choose a photo"
            chevron
            onPress={handlePickCustomWallpaper}
          />
        </ListSection>

        <ListSection title="Sync and storage">
          <ListRow
            icon="sync"
            title="Status"
            value={
              syncing ? 'Syncing' : pendingCount > 0 ? `${pendingCount} waiting` : 'Up to date'
            }
          />
          <ListRow icon="cloud" title="Realtime" value={realtimeStatus} />
          <ListRow
            icon="time-outline"
            title="Last sync"
            value={
              lastSyncedAt
                ? new Date(lastSyncedAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: !settings.use24Hour,
                  })
                : 'Never'
            }
          />
          <ListRow
            icon="refresh"
            title={busy ? 'Syncing…' : 'Sync now'}
            onPress={handleSync}
            disabled={busy}
          />
        </ListSection>

        <ListSection title="Notifications">
          <ListRow
            icon="notifications"
            title="Push notifications"
            supporting={pushStatus}
            onPress={handleRegisterPush}
            disabled={busy}
          />

          <View style={styles.padded}>
            <Text variant="bodyMedium" color="onSurfaceVariant" style={styles.label}>
              Sound
            </Text>
            <View style={styles.sounds}>
              {NOTIFICATION_SOUNDS.map((sound) => (
                <Chip
                  key={sound.id}
                  label={sound.label}
                  selected={selectedSound === sound.id}
                  onPress={() => void handleSelectSound(sound.id)}
                />
              ))}
            </View>
          </View>

          <ListRow
            icon="send-outline"
            title="Send a test notification"
            onPress={handleTestNotification}
          />
        </ListSection>

        <ListSection
          title="Data and privacy"
          footer="Messages and calendar entries sync between your two phones and are stored locally in an encrypted database. Sign in on a new device to recover synced content. There is no end-to-end encryption: the server operator can read synced content."
        >
          <ListRow icon="trash-outline" title="Clear local data" destructive onPress={handleClearData} />
        </ListSection>

        <ListSection>
          <ListRow icon="log-out-outline" title="Sign out" destructive onPress={handleSignOut} />
        </ListSection>

        {error ? (
          <Text variant="bodySmall" color="error" style={styles.error}>
            {error}
          </Text>
        ) : null}

        <Text variant="bodySmall" color="onSurfaceVariant" style={styles.footer}>
          Two · Private space for two
        </Text>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.lg, paddingBottom: spacing.xxxl },
  padded: { padding: spacing.lg },
  label: { marginBottom: spacing.md },
  swatches: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    padding: spacing.lg,
  },
  accentSwatch: {
    width: 40,
    height: 40,
    borderRadius: shape.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  patterns: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  pattern: {
    width: 92,
    height: 76,
    borderRadius: shape.lg,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xs,
  },
  photo: { alignItems: 'center', gap: spacing.sm, paddingBottom: spacing.lg },
  photoPreview: { width: 120, height: 120, borderRadius: shape.lg, borderWidth: 2 },
  sounds: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  error: { textAlign: 'center', marginTop: spacing.sm },
  footer: { textAlign: 'center', marginTop: spacing.lg },
});
