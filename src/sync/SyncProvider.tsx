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

import { runSyncCycle, type SyncResult } from './engine';
import { supabaseRemote } from './remote';
import { subscribeToCouple } from './realtime';
import { countPending } from '../db/outbox';
import { useAuth } from '../auth/AuthProvider';

interface SyncContextValue {
  syncing: boolean;
  lastResult: SyncResult | null;
  lastSyncedAt: string | null;
  pendingCount: number;
  realtimeStatus: string;
  syncNow: () => Promise<SyncResult | null>;
  notifyLocalChange: () => void;
}

const SyncContext = createContext<SyncContextValue | null>(null);

const FOREGROUND_INTERVAL_MS = 30_000;

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const db = useSQLiteContext();
  const { coupleId, refreshCouple } = useAuth();

  const [syncing, setSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [realtimeStatus, setRealtimeStatus] = useState('idle');

  const running = useRef(false);
  const queued = useRef(false);

  const refreshPending = useCallback(async () => {
    const count = await countPending(db);
    setPendingCount(count);
  }, [db]);

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
      return result;
    } finally {
      running.current = false;
      setSyncing(false);

      if (queued.current) {
        queued.current = false;
        void syncNow();
      }
    }
  }, [coupleId, db, refreshPending]);

  const notifyLocalChange = useCallback(() => {
    void refreshPending();
    void syncNow();
  }, [refreshPending, syncNow]);

  // Pull once when a space becomes available.
  useEffect(() => {
    if (coupleId) void syncNow();
  }, [coupleId, syncNow]);

  // Foreground refresh loop. This is the mechanism that works with no Realtime
  // at all, and it is what recovers from dropped events and reconnects.
  useEffect(() => {
    if (!coupleId) return undefined;

    const timer = setInterval(() => {
      if (AppState.currentState === 'active') void syncNow();
    }, FOREGROUND_INTERVAL_MS);

    const handleAppState = (state: AppStateStatus) => {
      if (state === 'active') void syncNow();
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
      realtimeStatus,
      syncNow,
      notifyLocalChange,
    }),
    [syncing, lastResult, lastSyncedAt, pendingCount, realtimeStatus, syncNow, notifyLocalChange],
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync(): SyncContextValue {
  const context = useContext(SyncContext);
  if (!context) throw new Error('useSync must be used inside SyncProvider');
  return context;
}
