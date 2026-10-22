import type { RealtimeChannel } from '@supabase/supabase-js';

import { supabase } from '../lib/supabase';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface RealtimeHandlers {
  onMessagesChanged: () => void;
  onEventsChanged: () => void;
  onNotesChanged: () => void;
  onMembersChanged: () => void;
  onStatus?: (status: 'SUBSCRIBED' | 'CHANNEL_ERROR' | 'TIMED_OUT' | 'CLOSED' | 'OTHER') => void;
}

/**
 * Subscribe to changes in one private space.
 *
 * Realtime is only a *hint*: the handlers are expected to trigger a pull from
 * the authoritative tables, because delivery is best-effort and `payload.old`
 * carries only the primary key under RLS.
 *
 * Returns a cleanup function. Calling it tears the channel down; without this,
 * a re-render leaves a stale `couple_id` filter running invisibly.
 */
export function subscribeToCouple(
  coupleId: string,
  handlers: RealtimeHandlers,
): () => void {
  if (!UUID_PATTERN.test(coupleId)) {
    // A malformed id would create a permanently silent channel.
    return () => undefined;
  }

  let disposed = false;

  const channel: RealtimeChannel = supabase
    .channel(`couple:${coupleId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `couple_id=eq.${coupleId}`,
      },
      () => {
        if (disposed) return;
        handlers.onMessagesChanged();
      },
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'events',
        filter: `couple_id=eq.${coupleId}`,
      },
      () => {
        if (disposed) return;
        handlers.onEventsChanged();
      },
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'notes',
        filter: `couple_id=eq.${coupleId}`,
      },
      () => {
        if (disposed) return;
        handlers.onNotesChanged();
      },
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'couple_members',
        filter: `couple_id=eq.${coupleId}`,
      },
      () => {
        if (disposed) return;
        handlers.onMembersChanged();
      },
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'profiles',
      },
      () => {
        if (disposed) return;
        handlers.onMembersChanged();
      },
    )
    .subscribe((status) => {
      if (disposed) return;
      const normalised =
        status === 'SUBSCRIBED' ||
        status === 'CHANNEL_ERROR' ||
        status === 'TIMED_OUT' ||
        status === 'CLOSED'
          ? status
          : 'OTHER';
      handlers.onStatus?.(normalised);
    });

  return () => {
    disposed = true;
    void supabase.removeChannel(channel);
  };
}
