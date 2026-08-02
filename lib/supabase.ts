import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupportedStorage } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';

const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.EXPO_PUBLIC_SUPABASE_KEY ??
  '';

export const isSupabaseConfigured =
  supabaseUrl.length > 0 &&
  !supabaseUrl.includes('your-project') &&
  supabaseAnonKey.length > 0 &&
  supabaseAnonKey !== 'your-anon-key';

const memoryStore = new Map<string, string>();

/** RN-safe auth storage (avoid `window` checks that break native). */
const authStorage: SupportedStorage = {
  getItem: async (key) => {
    if (Platform.OS === 'web' && typeof window === 'undefined') {
      return memoryStore.get(key) ?? null;
    }
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return memoryStore.get(key) ?? null;
    }
  },
  setItem: async (key, value) => {
    if (Platform.OS === 'web' && typeof window === 'undefined') {
      memoryStore.set(key, value);
      return;
    }
    try {
      await AsyncStorage.setItem(key, value);
    } catch {
      memoryStore.set(key, value);
    }
  },
  removeItem: async (key) => {
    if (Platform.OS === 'web' && typeof window === 'undefined') {
      memoryStore.delete(key);
      return;
    }
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      memoryStore.delete(key);
    }
  },
};

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      storage: authStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);
