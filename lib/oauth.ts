import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

export type OAuthProvider = 'google' | 'apple';

let authSessionReady = false;

function ensureAuthSession() {
  if (authSessionReady) return;
  authSessionReady = true;
  WebBrowser.maybeCompleteAuthSession();
}

/**
 * URL scheme from app.config.js (timesense-dev / timesense-sys / timesense).
 * Falls back to timesense if config is missing (should not happen in builds).
 */
function getAppScheme(): string {
  const scheme = Constants.expoConfig?.scheme;
  if (typeof scheme === 'string' && scheme.length > 0) {
    return scheme;
  }
  if (Array.isArray(scheme) && typeof scheme[0] === 'string') {
    return scheme[0];
  }
  return 'timesense';
}

/**
 * Deep link back into the app after Supabase finishes OAuth.
 * Expo Go must use exp:// (custom schemes are not owned by Expo Go).
 * Standalone / dev client → {scheme}://auth/callback (env-specific).
 */
export function getAuthRedirectUri(): string {
  // Expo Go: Linking.createURL always yields an exp:// URL the client can open.
  if (Constants.appOwnership === 'expo') {
    return Linking.createURL('auth/callback');
  }
  return makeRedirectUri({
    scheme: getAppScheme(),
    path: 'auth/callback',
  });
}

/** Tokens may arrive in query (?…) or hash (#…) depending on platform / browser. */
function extractAuthParams(url: string): {
  access_token?: string;
  refresh_token?: string;
  errorCode?: string;
} {
  const { params, errorCode } = QueryParams.getQueryParams(url);
  if (params.access_token || errorCode) {
    return {
      access_token: params.access_token,
      refresh_token: params.refresh_token,
      errorCode: errorCode ?? params.error,
    };
  }

  const hash = url.includes('#') ? url.split('#')[1] : '';
  if (hash) {
    const fromHash = Object.fromEntries(new URLSearchParams(hash));
    return {
      access_token: fromHash.access_token,
      refresh_token: fromHash.refresh_token,
      errorCode: fromHash.error,
    };
  }

  return {};
}

export async function createSessionFromUrl(url: string): Promise<boolean> {
  ensureAuthSession();
  const { access_token, refresh_token, errorCode } = extractAuthParams(url);
  if (errorCode) {
    throw new Error(errorCode);
  }
  if (!access_token) {
    return false;
  }

  const { error } = await supabase.auth.setSession({
    access_token,
    refresh_token: refresh_token ?? '',
  });
  if (error) {
    throw error;
  }
  return true;
}

/**
 * Browser-based OAuth (works on Android Expo Go + iOS + web).
 * Google Cloud needs a Web client; redirect is always Supabase callback first,
 * then Supabase redirects to this app's redirect URI.
 */
export async function signInWithOAuthProvider(
  provider: OAuthProvider,
): Promise<'success' | 'cancelled'> {
  ensureAuthSession();
  const redirectTo = getAuthRedirectUri();

  if (Platform.OS === 'android') {
    try {
      await WebBrowser.warmUpAsync();
    } catch {
      // optional
    }
  }

  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        skipBrowserRedirect: true,
        // Email + profile (given/family name). No contacts / drive / etc.
        scopes: provider === 'google' ? 'openid email profile' : undefined,
        queryParams:
          provider === 'google'
            ? {
                prompt: 'select_account',
              }
            : undefined,
      },
    });

    if (error) {
      throw error;
    }
    if (!data.url) {
      throw new Error('No OAuth URL returned from Supabase');
    }

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

    if (result.type !== 'success' || !('url' in result) || !result.url) {
      return 'cancelled';
    }

    const ok = await createSessionFromUrl(result.url);
    if (!ok) {
      throw new Error(
        'Signed in, but no session tokens were returned. Add this redirect URL in Supabase → Authentication → URL Configuration: ' +
          redirectTo,
      );
    }
    return 'success';
  } finally {
    if (Platform.OS === 'android') {
      try {
        await WebBrowser.coolDownAsync();
      } catch {
        // optional
      }
    }
  }
}
