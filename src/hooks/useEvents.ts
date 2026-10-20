import { useCallback, useEffect, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';

import { listEvents } from '../db/events';
import { useAuth } from '../auth/AuthProvider';
import { useSync } from '../sync/SyncProvider';
import { errorMessage } from '../utils/errors';
import type { CalendarEvent } from '../types';

export function useEvents() {
  const db = useSQLiteContext();
  const { coupleId } = useAuth();
  const { lastSyncedAt } = useSync();

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!coupleId) {
      setEvents([]);
      setLoading(false);
      return;
    }

    try {
      const rows = await listEvents(db, coupleId);
      setEvents(rows);
      setError(null);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [coupleId, db]);

  useEffect(() => {
    void reload();
  }, [reload, lastSyncedAt]);

  return { events, loading, error, reload };
}
