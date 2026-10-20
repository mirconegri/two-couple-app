import { useCallback, useEffect, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';

import { listMessages, retryMessage } from '../db/messages';
import { useAuth } from '../auth/AuthProvider';
import { useSync } from '../sync/SyncProvider';
import { errorMessage } from '../utils/errors';
import type { Message } from '../types';

const PAGE_SIZE = 40;

export function useMessages() {
  const db = useSQLiteContext();
  const { coupleId } = useAuth();
  const { lastSyncedAt, notifyLocalChange } = useSync();

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!coupleId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    try {
      const rows = await listMessages(db, coupleId, PAGE_SIZE, null);
      setMessages(rows);
      setHasMore(rows.length === PAGE_SIZE);
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

  const loadOlder = useCallback(async () => {
    if (!coupleId || loadingMore || !hasMore) return;

    const oldest = messages[messages.length - 1];
    if (!oldest) return;

    setLoadingMore(true);
    try {
      const rows = await listMessages(db, coupleId, PAGE_SIZE, oldest.clientCreatedAt);
      if (rows.length === 0) {
        setHasMore(false);
      } else {
        setMessages((previous) => {
          const seen = new Set(previous.map((item) => item.id));
          return [...previous, ...rows.filter((row) => !seen.has(row.id))];
        });
      }
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoadingMore(false);
    }
  }, [coupleId, db, hasMore, loadingMore, messages]);

  const retry = useCallback(
    async (id: string) => {
      await retryMessage(db, id);
      notifyLocalChange();
      await reload();
    },
    [db, notifyLocalChange, reload],
  );

  return { messages, loading, loadingMore, hasMore, error, reload, loadOlder, retry };
}
