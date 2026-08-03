import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PizzaMark } from '@/components/ui/PizzaMark';
import { TsButton } from '@/components/ui/TsButton';
import { getAuthRedirectUri } from '@/lib/oauth';
import { isSupabaseConfigured } from '@/lib/supabase';
import { colors, fonts } from '@/constants/theme';
import { useAuthStore } from '@/stores/authStore';

type Mode = 'sign_in' | 'sign_up' | 'magic';

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>('sign_in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [busy, setBusy] = useState(false);
  const [oauthBusy, setOauthBusy] = useState<'google' | null>(null);
  const [magicSent, setMagicSent] = useState(false);

  const error = useAuthStore((s) => s.error);
  const signInWithEmail = useAuthStore((s) => s.signInWithEmail);
  const signUpWithEmail = useAuthStore((s) => s.signUpWithEmail);
  const signInWithMagicLink = useAuthStore((s) => s.signInWithMagicLink);
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const handleAuthUrl = useAuthStore((s) => s.handleAuthUrl);
  const continueAsGuest = useAuthStore((s) => s.continueAsGuest);
  const clearError = useAuthStore((s) => s.clearError);

  const goHome = () => router.replace('/');

  useEffect(() => {
    const onUrl = async (url: string | null) => {
      if (!url) return;
      const ok = await handleAuthUrl(url);
      if (ok) goHome();
    };

    Linking.getInitialURL().then(onUrl);
    const sub = Linking.addEventListener('url', ({ url }) => {
      void onUrl(url);
    });
    return () => sub.remove();
  }, [handleAuthUrl]);

  const onGuest = () => {
    continueAsGuest();
    goHome();
  };

  const onSubmit = async () => {
    clearError();
    setBusy(true);
    try {
      if (mode === 'magic') {
        const ok = await signInWithMagicLink(email.trim());
        if (ok) setMagicSent(true);
        return;
      }
      const ok =
        mode === 'sign_in'
          ? await signInWithEmail(email.trim(), password)
          : await signUpWithEmail({
              email: email.trim(),
              password,
              username: username.trim(),
              firstName: firstName.trim(),
              lastName: lastName.trim(),
            });
      if (ok) goHome();
    } finally {
      setBusy(false);
    }
  };

  const onGoogle = async () => {
    clearError();
    setOauthBusy('google');
    try {
      const ok = await signInWithGoogle();
      if (ok) goHome();
    } finally {
      setOauthBusy(null);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <PizzaMark size={56} />
          <Text style={styles.brand}>TimeSense</Text>
          <Text style={styles.tagline}>Feel time. Don't fight it.</Text>
        </View>

        {!isSupabaseConfigured ? (
          <Text style={styles.warn}>
            Cloud auth needs Supabase keys in `.env`. Guest mode still works.
          </Text>
        ) : null}

        <View style={styles.tabs}>
          {(
            [
              ['sign_in', 'Sign in'],
              ['sign_up', 'Sign up'],
              ['magic', 'Magic link'],
            ] as const
          ).map(([id, label]) => (
            <Pressable
              key={id}
              onPress={() => {
                setMode(id);
                setMagicSent(false);
                clearError();
              }}
              style={[styles.tab, mode === id && styles.tabActive]}>
              <Text style={[styles.tabText, mode === id && styles.tabTextActive]}>{label}</Text>
            </Pressable>
          ))}
        </View>

        {mode === 'sign_up' ? (
          <>
            <TextInput
              style={styles.input}
              autoCapitalize="none"
              autoComplete="username"
              placeholder="Username"
              placeholderTextColor={colors.muted}
              value={username}
              onChangeText={setUsername}
            />
            <View style={styles.nameRow}>
              <TextInput
                style={[styles.input, styles.nameInput]}
                autoCapitalize="words"
                autoComplete="given-name"
                placeholder="First name"
                placeholderTextColor={colors.muted}
                value={firstName}
                onChangeText={setFirstName}
              />
              <TextInput
                style={[styles.input, styles.nameInput]}
                autoCapitalize="words"
                autoComplete="family-name"
                placeholder="Last name"
                placeholderTextColor={colors.muted}
                value={lastName}
                onChangeText={setLastName}
              />
            </View>
          </>
        ) : null}

        <TextInput
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          placeholder="Email"
          placeholderTextColor={colors.muted}
          value={email}
          onChangeText={setEmail}
        />

        {mode !== 'magic' ? (
          <TextInput
            style={styles.input}
            secureTextEntry
            autoComplete={mode === 'sign_in' ? 'password' : 'new-password'}
            placeholder="Password"
            placeholderTextColor={colors.muted}
            value={password}
            onChangeText={setPassword}
          />
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {magicSent ? (
          <Text style={styles.ok}>Check your email for the sign-in link.</Text>
        ) : null}

        <TsButton
          label={
            mode === 'sign_in' ? 'Continue' : mode === 'sign_up' ? 'Create account' : 'Send magic link'
          }
          block
          disabled={
            busy ||
            !email.trim() ||
            (mode !== 'magic' && password.length < 6) ||
            (mode === 'sign_up' &&
              (!username.trim() || !firstName.trim() || !lastName.trim()))
          }
          onPress={() => void onSubmit()}
          style={{ marginBottom: 10 }}
        />
        {busy ? <ActivityIndicator color={colors.sauce} style={{ marginBottom: 8 }} /> : null}

        {/* Sign in with Apple hidden until setup complete — see docs/BACKLOG.md */}

        <TsButton
          label={oauthBusy === 'google' ? 'Opening Google…' : 'Continue with Google'}
          variant="secondary"
          block
          disabled={Boolean(oauthBusy) || !isSupabaseConfigured}
          onPress={() => void onGoogle()}
          style={{ marginBottom: 16 }}
        />

        {oauthBusy ? (
          <Text style={styles.oauthHint}>
            Finish in the browser, then return here. If it hangs, add the OAuth redirect below in
            Supabase URL Configuration.
          </Text>
        ) : null}

        {__DEV__ ? (
          <Text style={styles.devHint}>OAuth redirect: {getAuthRedirectUri()}</Text>
        ) : null}

        <TsButton label="Skip for now — try it offline" variant="ghost" onPress={onGuest} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.plate,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    flexGrow: 1,
    justifyContent: 'center',
  },
  hero: {
    alignItems: 'center',
    marginBottom: 24,
  },
  brand: {
    marginTop: 14,
    fontFamily: fonts.display,
    fontSize: 34,
    color: colors.ink,
  },
  tagline: {
    marginTop: 6,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.muted,
  },
  warn: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: colors.cheese,
    color: colors.ink,
    fontFamily: fonts.body,
    fontSize: 13,
  },
  tabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: {
    backgroundColor: colors.crust,
    borderColor: colors.crust,
  },
  tabText: {
    fontFamily: fonts.bodyMedium,
    color: colors.muted,
    fontSize: 13,
  },
  tabTextActive: {
    color: colors.board,
  },
  input: {
    backgroundColor: colors.cream,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: fonts.body,
    color: colors.ink,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  nameRow: {
    flexDirection: 'row',
    gap: 10,
  },
  nameInput: {
    flex: 1,
  },
  error: {
    color: colors.sauce,
    marginBottom: 8,
    fontFamily: fonts.body,
    fontSize: 14,
  },
  ok: {
    color: colors.basil,
    marginBottom: 8,
    fontFamily: fonts.body,
    fontSize: 14,
  },
  oauthHint: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: fonts.body,
  },
  devHint: {
    marginBottom: 8,
    fontSize: 11,
    color: colors.muted,
    textAlign: 'center',
    fontFamily: fonts.body,
  },
});
