import React, { useEffect, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import * as Notifications from 'expo-notifications';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '../../src/components/Screen';
import { ListSection } from '../../src/components/ListSection';
import { ListRow } from '../../src/components/ListRow';
import { StatusPill } from '../../src/components/StatusPill';
import { NavBarButton } from '../../src/components/NavBarButton';
import { SegmentedControl } from '../../src/components/SegmentedControl';
import { PressableScale } from '../../src/components/PressableScale';
import { useAuth } from '../../src/auth/AuthProvider';
import { useSync } from '../../src/sync/SyncProvider';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useWallpaper } from '../../src/theme/WallpaperProvider';
import { WALLPAPER_PRESETS } from '../../src/theme/wallpaper';
import { accents, accentKeys } from '../../src/theme/preferences';
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

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const { colors, spacing, typography, scheme, prefs, updatePrefs } = useTheme();
  const { email, userId, coupleId, members, signOut, refreshCouple } = useAuth();
  const { pendingCount, realtimeStatus, lastSyncedAt, syncing, syncNow } = useSync();
  const { prefs: wallpaperPrefs, setPreset, setCustomPhoto, setScope, resetToDefault } = useWallpaper();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pushStatus, setPushStatus] = useState<string>('Checking…');
  const [selectedSound, setSelectedSound] = useState<NotificationSoundId>('default');

  useEffect(() => {
    void getMeta(db, 'push_token_status').then((val) => {
      setPushStatus(val || 'Not registered');
    });
    void loadNotificationSound().then((snd) => setSelectedSound(snd));
  }, [db]);

  const handleSelectSound = async (soundId: NotificationSoundId) => {
    setSelectedSound(soundId);
    await saveNotificationSound(soundId);
    void playSoundPreview(soundId);
  };

  const handlePickCustomWallpaper = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Permesso richiesto',
          'Consenti l\'accesso alla galleria per impostare una foto come sfondo.',
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.85,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        await setCustomPhoto(result.assets[0].uri);
      }
    } catch {
      Alert.alert('Errore', 'Impossibile selezionare la foto dalla galleria.');
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
      const granted = await ensureNotificationPermission();
      if (!granted) {
        Alert.alert('Permission required', 'Please enable notifications in system settings.');
        return;
      }
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Two',
          body: 'Notifications are working properly!',
          sound: 'default',
        },
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
    const res = await registerForPushNotifications(coupleId, userId, db);
    const updated = await getMeta(db, 'push_token_status');
    setPushStatus(updated || (res.ok ? 'Active (token registered)' : res.reason || 'Failed'));
    setBusy(false);
  };

  return (
    <Screen scroll>
      <View style={{ paddingTop: spacing.md, paddingBottom: spacing.xxxl }}>
        {/* Navigation header */}
        <View style={styles.navHeader}>
          <NavBarButton
            icon="chevron-back"
            label="Home"
            onPress={() => router.back()}
          />
        </View>

        {/* Large Title */}
        <Text style={[typography.largeTitle, { color: colors.text, marginBottom: spacing.lg }]}>
          Settings
        </Text>

        {/* Profile & Space Section */}
        <ListSection title="Space & Profile">
          <ListRow
            label="Your name"
            value={me?.displayName ?? 'Not set'}
            icon="person"
            iconBg={colors.accent}
            chevron
            onPress={() => router.push('/(app)/profile')}
          />
          <ListRow
            label="Signed in as"
            value={email ?? '—'}
            icon="mail"
            iconBg="#8E8E93"
          />
          <ListRow
            label="Your space"
            value={coupleId ? 'Active (2 members)' : 'Not set up'}
            icon="heart"
            iconBg="#FF2D55"
          />
          <ListRow
            label="Partner"
            value={partner ? (partner.displayName || 'Joined') : 'Waiting to join'}
            icon="people"
            iconBg="#AF52DE"
          />
          {members.length < 2 ? (
            <ListRow
              label="Invite your partner"
              icon="person-add"
              iconBg="#34C759"
              chevron
              onPress={() => router.push('/(app)/invite')}
            />
          ) : null}
        </ListSection>

        {/* Appearance Section */}
        <ListSection title="Aspetto">
          <View style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.md }}>
            <SegmentedControl
              options={[
                { value: 'auto', label: 'Auto' },
                { value: 'light', label: 'Chiaro' },
                { value: 'dark', label: 'Scuro' },
              ]}
              value={prefs.mode}
              onChange={(mode) => updatePrefs({ mode })}
            />
          </View>
          <View style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}>
            <Text
              style={[
                typography.subheadline,
                { color: colors.textMuted, marginBottom: spacing.sm },
              ]}
            >
              Colore accento
            </Text>
            <View style={styles.swatchRow}>
              {accentKeys.map((key) => {
                const isSelected = prefs.accent === key;
                const accentDef = accents[key];
                const swatchBg = scheme === 'dark' ? accentDef.dark : accentDef.light;

                return (
                  <PressableScale
                    key={key}
                    onPress={() => updatePrefs({ accent: key })}
                    haptics="selection"
                    scaleTo={0.92}
                    accessibilityRole="button"
                    accessibilityLabel={accentDef.label}
                    accessibilityState={{ selected: isSelected }}
                    style={[
                      styles.accentSwatch,
                      {
                        backgroundColor: swatchBg,
                        borderColor: isSelected ? colors.text : colors.border,
                        borderWidth: isSelected ? 2 : 1,
                      },
                    ]}
                  >
                    {isSelected ? (
                      <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                    ) : null}
                  </PressableScale>
                );
              })}
            </View>
          </View>
        </ListSection>

        {/* Romantic Wallpapers & Custom Photo Section */}
        <ListSection title="Sfondo Romantico & Foto">
          <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xs }}>
            <Text style={[typography.subheadline, { color: colors.textMuted, marginBottom: spacing.sm }]}>
              Applica a
            </Text>
            <SegmentedControl
              options={[
                { value: 'chat', label: 'Solo Chat' },
                { value: 'all', label: 'Tutta l\'app' },
              ]}
              value={wallpaperPrefs.scope}
              onChange={(scope) => void setScope(scope as 'chat' | 'all')}
            />
          </View>

          <View style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}>
            <Text style={[typography.subheadline, { color: colors.textMuted, marginBottom: spacing.sm }]}>
              Pattern romantici
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.wallpaperScroll}>
              {WALLPAPER_PRESETS.map((p) => {
                const isSelected = wallpaperPrefs.id === p.id;
                const cardBg = scheme === 'dark' ? p.previewColorDark : p.previewColorLight;
                return (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() => void setPreset(p.id)}
                    style={[
                      styles.wallpaperCard,
                      {
                        backgroundColor: cardBg,
                        borderColor: isSelected ? colors.accent : colors.border,
                        borderWidth: isSelected ? 2 : 1,
                      },
                    ]}
                  >
                    <Ionicons name={p.icon as any} size={24} color={p.accentTone} />
                    <Text
                      style={[
                        typography.caption2,
                        {
                          color: colors.text,
                          fontWeight: isSelected ? '700' : '500',
                          marginTop: 6,
                          textAlign: 'center',
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {p.title}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {wallpaperPrefs.id === 'custom' && wallpaperPrefs.customUri ? (
            <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.md, alignItems: 'center' }}>
              <View style={[styles.customPhotoPreview, { borderColor: colors.accent }]}>
                <Image
                  source={{ uri: wallpaperPrefs.customUri }}
                  style={StyleSheet.absoluteFillObject}
                  resizeMode="cover"
                />
              </View>
              <Text style={[typography.caption, { color: colors.textMuted, marginVertical: spacing.xs }]}>
                Foto personalizzata attiva
              </Text>
              <PressableScale
                onPress={() => void resetToDefault()}
                style={[styles.smallBtn, { backgroundColor: colors.surfaceMuted }]}
              >
                <Text style={[typography.caption, { color: colors.danger }]}>Rimuovi foto</Text>
              </PressableScale>
            </View>
          ) : null}

          <ListRow
            label="Carica foto dalla galleria"
            icon="image"
            iconBg="#FF2D55"
            chevron
            onPress={handlePickCustomWallpaper}
          />
        </ListSection>

        {/* Sync Section */}
        <ListSection title="Sync & Storage">
          <ListRow
            label="Status"
            icon="sync"
            iconBg={colors.accent}
            rightAction={
              <StatusPill
                label={
                  syncing
                    ? 'Syncing'
                    : pendingCount > 0
                      ? `${pendingCount} pending`
                      : 'Up to date'
                }
                tone={pendingCount > 0 ? 'pending' : 'success'}
              />
            }
          />
          <ListRow
            label="Realtime"
            value={realtimeStatus}
            icon="cloud"
            iconBg="#5856D6"
          />
          <ListRow
            label="Last sync"
            value={lastSyncedAt ? new Date(lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never'}
            icon="time"
            iconBg="#FF9500"
          />
          <ListRow
            label={busy ? 'Syncing…' : 'Sync now'}
            onPress={handleSync}
            disabled={busy}
          />
        </ListSection>

        {/* Notifications Section */}
        <ListSection title="Notifiche & Suoni">
          <ListRow
            label="Push notifications"
            value={pushStatus}
            icon="notifications"
            iconBg="#FF3B30"
            onPress={handleRegisterPush}
            disabled={busy}
          />
          <View style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}>
            <Text style={[typography.subheadline, { color: colors.textMuted, marginBottom: spacing.sm }]}>
              Suono notifiche
            </Text>
            <View style={styles.soundList}>
              {NOTIFICATION_SOUNDS.map((snd) => {
                const isSelected = selectedSound === snd.id;
                return (
                  <TouchableOpacity
                    key={snd.id}
                    onPress={() => void handleSelectSound(snd.id)}
                    style={[
                      styles.soundRow,
                      {
                        backgroundColor: isSelected ? colors.surfaceMuted : 'transparent',
                        borderColor: isSelected ? colors.accent : colors.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name={snd.icon as any}
                      size={20}
                      color={isSelected ? colors.accent : colors.textFaint}
                    />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[typography.body, { color: colors.text, fontWeight: isSelected ? '600' : '400' }]}>
                        {snd.label}
                      </Text>
                      <Text style={[typography.caption2, { color: colors.textMuted }]}>
                        {snd.description}
                      </Text>
                    </View>
                    {isSelected ? (
                      <Ionicons name="checkmark-circle" size={20} color={colors.accent} />
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          <ListRow
            label="Send test notification"
            onPress={handleTestNotification}
          />
        </ListSection>

        {/* Privacy & Safety */}
        <ListSection
          title="Data & Privacy"
          footer="Messages and calendar entries are synced between your two phones and stored locally in an encrypted database. Sign in on a new device anytime to recover synced content."
        >
          <ListRow
            label="Clear local data"
            destructive
            onPress={handleClearData}
          />
        </ListSection>

        {/* Sign Out */}
        <ListSection>
          <ListRow
            label="Sign out"
            destructive
            onPress={handleSignOut}
          />
        </ListSection>

        {error ? (
          <Text style={[typography.footnote, { color: colors.danger, textAlign: 'center', marginTop: spacing.sm }]}>
            {error}
          </Text>
        ) : null}

        <Text
          style={[
            typography.footnote,
            { color: colors.textFaint, textAlign: 'center', marginTop: spacing.md },
          ]}
        >
          Two • Private space for two
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  swatchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  accentSwatch: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wallpaperScroll: {
    gap: 10,
    paddingRight: 10,
  },
  wallpaperCard: {
    width: 90,
    height: 82,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  customPhotoPreview: {
    width: 90,
    height: 90,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
  },
  smallBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  soundList: {
    gap: 8,
  },
  soundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
});
