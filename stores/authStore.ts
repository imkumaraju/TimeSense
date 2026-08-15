import type { Session, User } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { create } from 'zustand';

import {
  createSessionFromUrl,
  signInWithOAuthProvider,
} from '@/lib/oauth';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export type AuthMode = 'loading' | 'guest' | 'signed_in';

export type EmailSignUpInput = {
  email: string;
  password: string;
  username: string;
  firstName: string;
  lastName: string;
};

type AuthState = {
  mode: AuthMode;
  session: Session | null;
  user: User | null;
  error: string | null;
  /** Call once at app start. */
  hydrate: () => () => void;
  continueAsGuest: () => void;
  signInWithEmail: (email: string, password: string) => Promise<boolean>;
  signUpWithEmail: (input: EmailSignUpInput) => Promise<boolean>;
  signInWithMagicLink: (email: string) => Promise<boolean>;
  signInWithGoogle: () => Promise<boolean>;
  signInWithApple: () => Promise<boolean>;
  handleAuthUrl: (url: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  clearError: () => void;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  mode: 'loading',
  session: null,
  user: null,
  error: null,

  hydrate: () => {
    if (!isSupabaseConfigured) {
      set({ mode: 'guest', session: null, user: null });
      return () => {};
    }

    let alive = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      if (data.session) {
        set({
          mode: 'signed_in',
          session: data.session,
          user: data.session.user,
        });
      } else if (get().mode === 'loading') {
        set({ mode: 'guest', session: null, user: null });
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!alive) return;
      if (session) {
        set({ mode: 'signed_in', session, user: session.user, error: null });
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
          void (async () => {
            try {
              const { prepareAccountAfterAuth } = await import(
                '@/lib/accountLifecycle'
              );
              const prepared = await prepareAccountAfterAuth(session.user, {
                freshStartIfInactive: event === 'SIGNED_IN',
              });
              if (prepared.status === 'signed_out_inactive') {
                if (!alive) return;
                set({ mode: 'guest', session: null, user: null });
                return;
              }
              const { syncNow } = await import('@/lib/syncService');
              await syncNow();
            } catch (e) {
              if (!alive) return;
              set({
                error:
                  e instanceof Error ? e.message : 'Could not prepare account',
              });
            }
          })();
        }
      } else {
        set({ mode: 'guest', session: null, user: null });
      }
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  },

  continueAsGuest: () => {
    set({ mode: 'guest', session: null, user: null, error: null });
  },

  signInWithEmail: async (email, password) => {
    if (!isSupabaseConfigured) {
      set({ error: 'Supabase is not configured. Add keys to .env (see .env.example).' });
      return false;
    }
    set({ error: null });
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      set({ error: error.message });
      return false;
    }
    return true;
  },

  signUpWithEmail: async (input) => {
    if (!isSupabaseConfigured) {
      set({ error: 'Supabase is not configured. Add keys to .env (see .env.example).' });
      return false;
    }
    const email = input.email.trim();
    const username = input.username.trim();
    const firstName = input.firstName.trim();
    const lastName = input.lastName.trim();
    if (!username || !firstName || !lastName) {
      set({ error: 'Username, first name, and last name are required.' });
      return false;
    }
    set({ error: null });
    const fullName = `${firstName} ${lastName}`.trim();
    const { error } = await supabase.auth.signUp({
      email,
      password: input.password,
      options: {
        data: {
          username,
          first_name: firstName,
          last_name: lastName,
          full_name: fullName,
          display_name: fullName,
        },
      },
    });
    if (error) {
      set({ error: error.message });
      return false;
    }
    return true;
  },

  signInWithMagicLink: async (email) => {
    if (!isSupabaseConfigured) {
      set({ error: 'Supabase is not configured. Add keys to .env (see .env.example).' });
      return false;
    }
    set({ error: null });
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: 'timesense://auth/callback' },
    });
    if (error) {
      set({ error: error.message });
      return false;
    }
    return true;
  },

  signInWithGoogle: async () => {
    if (!isSupabaseConfigured) {
      set({ error: 'Supabase is not configured. Add keys to .env (see .env.example).' });
      return false;
    }
    set({ error: null });
    try {
      const result = await signInWithOAuthProvider('google');
      return result === 'success';
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Google sign-in failed' });
      return false;
    }
  },

  signInWithApple: async () => {
    if (!isSupabaseConfigured) {
      set({ error: 'Supabase is not configured. Add keys to .env (see .env.example).' });
      return false;
    }
    set({ error: null });
    try {
      // Lazy-load so Android never touches the native Apple module at import time.
      if (Platform.OS === 'ios') {
        const AppleAuthentication = await import('expo-apple-authentication');
        const available = await AppleAuthentication.isAvailableAsync();
        if (available) {
          const credential = await AppleAuthentication.signInAsync({
            // Only email + name — nothing else.
            requestedScopes: [
              AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
              AppleAuthentication.AppleAuthenticationScope.EMAIL,
            ],
          });
          if (!credential.identityToken) {
            throw new Error('Apple did not return an identity token');
          }
          const { error } = await supabase.auth.signInWithIdToken({
            provider: 'apple',
            token: credential.identityToken,
          });
          if (error) {
            throw error;
          }
          // Apple only returns the name on the first authorization — persist it.
          const given = credential.fullName?.givenName?.trim() || null;
          const family = credential.fullName?.familyName?.trim() || null;
          if (given || family) {
            const fullName = [given, family].filter(Boolean).join(' ');
            await supabase.auth.updateUser({
              data: {
                first_name: given,
                last_name: family,
                given_name: given,
                family_name: family,
                full_name: fullName,
                name: fullName,
              },
            });
          }
          return true;
        }
      }

      const result = await signInWithOAuthProvider('apple');
      return result === 'success';
    } catch (e) {
      if (
        e &&
        typeof e === 'object' &&
        'code' in e &&
        (e as { code?: string }).code === 'ERR_REQUEST_CANCELED'
      ) {
        return false;
      }
      set({ error: e instanceof Error ? e.message : 'Apple sign-in failed' });
      return false;
    }
  },

  handleAuthUrl: async (url) => {
    try {
      return await createSessionFromUrl(url);
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Could not complete sign-in from link' });
      return false;
    }
  },

  signOut: async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    set({ mode: 'guest', session: null, user: null, error: null });
  },

  clearError: () => set({ error: null }),
}));
