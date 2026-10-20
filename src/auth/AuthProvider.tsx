import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import type { SQLiteDatabase } from 'expo-sqlite';

import { supabase } from '../lib/supabase';
import { errorMessage } from '../utils/errors';
import type { Member } from '../types';

interface AuthContextValue {
  ready: boolean;
  session: Session | null;
  userId: string | null;
  email: string | null;
  coupleId: string | null;
  members: Member[];
  authError: string | null;
  refreshCouple: (db: SQLiteDatabase | null) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface MemberRow {
  user_id: string;
  couple_id: string;
  joined_at: string;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [authError, setAuthError] = useState<string | null>(null);

  const lastUserId = useRef<string | null>(null);

  const loadCouple = useCallback(async (db: SQLiteDatabase | null) => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id ?? null;

    if (!userId) {
      setCoupleId(null);
      setMembers([]);
      return;
    }

    const { data, error } = await supabase
      .from('couple_members')
      .select('user_id, couple_id, joined_at');

    if (error) {
      setAuthError(errorMessage(error));
      return;
    }

    const rows = (data ?? []) as MemberRow[];
    const first = rows[0];
    const resolvedCoupleId = first?.couple_id ?? null;

    setCoupleId(resolvedCoupleId);
    setMembers(
      rows.map((row) => ({
        userId: row.user_id,
        email: null,
        displayName: null,
        coupleId: row.couple_id,
        joinedAt: row.joined_at,
      })),
    );
    setAuthError(null);

    if (db && resolvedCoupleId) {
      // Cache membership locally so the app can render offline.
      await db.runAsync('delete from members where couple_id = ?', resolvedCoupleId);
      for (const row of rows) {
        await db.runAsync(
          `insert into members (user_id, email, display_name, couple_id, joined_at)
           values (?, null, null, ?, ?)
           on conflict (user_id) do update set couple_id = excluded.couple_id`,
          row.user_id,
          row.couple_id,
          row.joined_at,
        );
      }
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      lastUserId.current = data.session?.user.id ?? null;
      await loadCouple(null);
      if (mounted) setReady(true);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (_event, nextSession) => {
        if (!mounted) return;
        setSession(nextSession);

        const nextUserId = nextSession?.user.id ?? null;
        if (nextUserId !== lastUserId.current) {
          lastUserId.current = nextUserId;
          await loadCouple(null);
        }
      },
    );

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [loadCouple]);

  const signIn = useCallback(async (email: string, password: string) => {
    setAuthError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) {
      const message = errorMessage(error);
      setAuthError(message);
      throw new Error(message);
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    setAuthError(null);
    const { error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) {
      const message = errorMessage(error);
      setAuthError(message);
      throw new Error(message);
    }
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setCoupleId(null);
    setMembers([]);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      session,
      userId: session?.user.id ?? null,
      email: session?.user.email ?? null,
      coupleId,
      members,
      authError,
      refreshCouple: loadCouple,
      signIn,
      signUp,
      signOut,
    }),
    [ready, session, coupleId, members, authError, loadCouple, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
