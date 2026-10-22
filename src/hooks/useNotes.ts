import { useCallback, useEffect, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';

import { listNotes } from '../db/notes';
import { useAuth } from '../auth/AuthProvider';
import { useSync } from '../sync/SyncProvider';
import { errorMessage } from '../utils/errors';
import type { Note } from '../types';

export function useNotes() {
  const db = useSQLiteContext();
  const { coupleId } = useAuth();
  const { lastSyncedAt } = useSync();

  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!coupleId) {
      setNotes([]);
      setLoading(false);
      return;
    }

    try {
      const rows = await listNotes(db, coupleId);
      setNotes(rows);
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

  return { notes, loading, error, reload };
}
