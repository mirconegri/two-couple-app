import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import * as Notifications from 'expo-notifications';

import { runSyncCycle, type SyncResult } from './engine';
import { supabaseRemote } from './remote';
import { subscribeToCouple } from './realtime';
import { countPending } from '../db/outbox';
import { countUnread } from '../db/messages';
import { useAuth } from '../auth/AuthProvider';
import { rescheduleAllReminders } from '../notifications/reminders';

interface SyncContextValue {
  syncing: boolean;
  lastResult: SyncResult | null;
  lastSyncedAt: string | null;
  pendingCount: number;
  unreadCount: number;
  realtimeStatus: string;
  syncNow: () => Promise<SyncResult | null>;
  notifyLocalChange: () => void;
  refreshUnread: () => Promise<void>;
  setChatActive: (active: boolean) => void;
}

const SyncContext = createContext<SyncContextValue | null>(null);

const FOREGROUND_INTERVAL_MS = 30_000;

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const db = useSQLiteContext();
  const { coupleId, userId, members, refreshCouple } = useAuth();

  const [syncing, setSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [realtimeStatus, setRealtimeStatus] = useState('idle');

  const running = useRef(false);
  const queued = useRef(false);
  const isChatActive = useRef(false);

  const setChatActive = useCallback((active: boolean) => {
    isChatActive.current = active;
  }, []);

  const refreshPending = useCallback(async () => {
    const count = await countPending(db);
    setPendingCount(count);
  }, [db]);

  const refreshUnread = useCallback(async () => {
    if (!coupleId || !userId) {
      setUnreadCount(0);
      return;
    }
    const count = await countUnread(db, coupleId, userId);
    setUnreadCount(count);
    void Notifications.setBadgeCountAsync(count).catch(() => {});
  }, [coupleId, db, userId]);

  const syncNow = useCallback(async (): Promise<SyncResult | null> => {
    if (!coupleId) return null;

    // A pull may be requested while one is already running (Realtime can fire
    // several events per second). Coalesce instead of stacking calls.
    if (running.current) {
      queued.current = true;
      return null;
    }

    running.current = true;
    setSyncing(true);

    try {
      const result = await runSyncCycle(db, supabaseRemote, coupleId);
      setLastResult(result);
      setLastSyncedAt(new Date().toISOString());
      await refreshPending();
      await refreshCouple(db);
      await refreshUnread();

      // If new messages arrived from partner while outside chat, trigger local notification
      if (result.pulledMessages > 0 && userId) {
        const unread = await countUnread(db, coupleId, userId);
        if (unread > 0 && !isChatActive.current) {
          const partner = members.find((m) => m.userId !== userId);
          void Notifications.scheduleNotificationAsync({
            content: {
              title: partner?.displayName || 'New message',
              body: 'You have a new message',
              data: { type: 'chat', coupleId },
              sound: 'default',
            },
            trigger: null,
          }).catch(() => {});
        }
      }

      if (result.pulledEvents > 0) {
        void rescheduleAllReminders(db, coupleId);
      }
      return result;
    } finally {
      running.current = false;
      setSyncing(false);

      if (queued.current) {
        queued.current = false;
        void syncNow();
      }
    }
  }, [coupleId, db, members, refreshCouple, refreshPending, refreshUnread, userId]);

  const notifyLocalChange = useCallback(() => {
    void refreshPending();
    void refreshUnread();
    void syncNow();
  }, [refreshPending, refreshUnread, syncNow]);

  // Pull once when a space becomes available or identity is established.
  useEffect(() => {
    if (coupleId) {
      void syncNow();
      void refreshUnread();
    }
  }, [coupleId, refreshUnread, syncNow]);

  // Foreground refresh loop. This is the mechanism that works with no Realtime
  // at all, and it is what recovers from dropped events and reconnects.
  useEffect(() => {
    if (!coupleId) return undefined;

    const timer = setInterval(() => {
      if (AppState.currentState === 'active') void syncNow();
    }, FOREGROUND_INTERVAL_MS);

    const handleAppState = (state: AppStateStatus) => {
      if (state === 'active') {
        void syncNow();
        void rescheduleAllReminders(db, coupleId);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppState);

    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [coupleId, syncNow]);

  // Realtime is an optimisation on top of the pull loop.
  useEffect(() => {
    if (!coupleId) return undefined;

    const unsubscribe = subscribeToCouple(coupleId, {
      onMessagesChanged: () => void syncNow(),
      onEventsChanged: () => void syncNow(),
      onNotesChanged: () => void syncNow(),
      onMembersChanged: () => void syncNow(),
      onStatus: (status) => setRealtimeStatus(status),
    });

    return unsubscribe;
  }, [coupleId, syncNow]);

  const value = useMemo<SyncContextValue>(
    () => ({
      syncing,
      lastResult,
      lastSyncedAt,
      pendingCount,
      unreadCount,
      realtimeStatus,
      syncNow,
      notifyLocalChange,
      refreshUnread,
      setChatActive,
    }),
    [
      syncing,
      lastResult,
      lastSyncedAt,
      pendingCount,
      unreadCount,
      realtimeStatus,
      syncNow,
      notifyLocalChange,
      refreshUnread,
      setChatActive,
    ],
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync(): SyncContextValue {
  const context = useContext(SyncContext);
  if (!context) throw new Error('useSync must be used inside SyncProvider');
  return context;
}
