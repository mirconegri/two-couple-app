import Constants from 'expo-constants';

interface AppExtra {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  eas?: { projectId?: string };
}

const extra = (Constants.expoConfig?.extra ?? {}) as AppExtra;

export const SUPABASE_URL: string =
  extra.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL || '';

export const SUPABASE_ANON_KEY: string =
  extra.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const EAS_PROJECT_ID: string =
  extra.eas?.projectId || process.env.EAS_PROJECT_ID || '';

export function isConfigured(): boolean {
  return SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
}

export function assertConfigured(): void {
  if (!isConfigured()) {
    throw new Error(
      'Supabase is not configured. Copy .env.example to .env, fill in ' +
        'EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY, then ' +
        'restart with: npx expo start --clear',
    );
  }
}
