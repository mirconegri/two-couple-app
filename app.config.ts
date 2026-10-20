import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Config is generated at build time so no secret is committed.
 * All client-visible values here are the *public* anon key and URL only.
 * The Supabase service_role key must NEVER appear in this file or in the bundle.
 */
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Two',
  slug: 'two-couple-app',
  scheme: 'twocouple',
  version: '1.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  icon: './assets/icon.png',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#0B3B36',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'app.twocouple.private',
  },
  android: {
    package: 'app.twocouple.private',
    versionCode: 1,
    edgeToEdgeEnabled: true,
    permissions: [
      'android.permission.POST_NOTIFICATIONS',
      'android.permission.SCHEDULE_EXACT_ALARM',
      'android.permission.RECEIVE_BOOT_COMPLETED',
      'android.permission.VIBRATE',
      'android.permission.USE_BIOMETRIC'
    ],
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    [
      'expo-sqlite',
      {
        // Encrypts the on-device database. Requires a development build
        // (not Expo Go) and must be verified on real hardware.
        useSQLCipher: true
      }
    ],
    [
      'expo-notifications',
      {
        color: '#0F766E',
        defaultChannel: 'messages'
      }
    ],
  ],
  experiments: {
    typedRoutes: false,
    tsconfigPaths: true
  },
  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
    eas: {
      projectId: process.env.EAS_PROJECT_ID ?? ''
    }
  }
});
