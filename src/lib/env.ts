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
