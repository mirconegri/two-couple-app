import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

import { SUPABASE_ANON_KEY, SUPABASE_URL } from './env';

/**
 * The Supabase client. Only the *anon* key is present here.
 * The service_role key bypasses RLS and must never ship in the bundle.
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  realtime: {
    params: {
      // Realtime reconnects on its own; the sync engine re-pulls regardless.
      eventsPerSecond: 5,
    },
  },
});
