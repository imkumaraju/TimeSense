import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TsCard } from '@/components/ui/TsCard';
import { TsChip } from '@/components/ui/TsChip';
import { TsSectionLabel } from '@/components/ui/TsSectionLabel';
import { STYLE_OPTIONS, colors, fonts } from '@/constants/theme';
import {
  getDefaultVisualStyle,
  getSoundHapticsEnabled,
  setDefaultVisualStyle,
  setSoundHapticsEnabled,
} from '@/lib/settings';
import { getLastSyncedAt, syncNow } from '@/lib/syncService';
import { getStreakProfile } from '@/lib/streakService';
import { useAuthStore } from '@/stores/authStore';
import type { VisualStyle } from '@/types/task';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const mode = useAuthStore((s) => s.mode);
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);

  const [defaultStyle, setDefaultStyle] = useState<VisualStyle>('pizza');
  const [soundOn, setSoundOn] = useState(true);
  const [syncHint, setSyncHint] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [pickingStyle, setPickingStyle] = useState(false);
  const [streakCount, setStreakCount] = useState(0);
  const [freezesAvailable, setFreezesAvailable] = useState(2);

  const reload = useCallback(async () => {
    setDefaultStyle(await getDefaultVisualStyle());
    setSoundOn(await getSoundHapticsEnabled());
    const profile = await getStreakProfile(user?.id ?? null);
    setStreakCount(profile?.streakCount ?? 0);
    setFreezesAvailable(profile?.freezesAvailable ?? 2);
    const last = await getLastSyncedAt();
    if (last) {
      setSyncHint(`Last synced ${new Date(last).toLocaleString()}`);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const onSync = async () => {
    setSyncing(true);
    try {
      const result = await syncNow();
      if (!result.ok) {
        setSyncHint(result.error ?? 'Sync failed');
        return;
      }
      setSyncHint(
        `Synced — pushed ${result.pushed}, pulled ${result.pulled}`,
      );
    } finally {
      setSyncing(false);
    }
  };

  const onSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      router.replace('/');
    } finally {
      setSigningOut(false);
    }
  };

  const onToggleSound = async (value: boolean) => {
    setSoundOn(value);
    await setSoundHapticsEnabled(value);
  };

  const onPickStyle = async (style: VisualStyle) => {
    setDefaultStyle(style);
    await setDefaultVisualStyle(style);
    setPickingStyle(false);
  };

  const styleLabel =
    STYLE_OPTIONS.find((s) => s.value === defaultStyle)?.label ?? 'Radial';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 32 },
      ]}>
      <Text style={styles.title}>Settings</Text>

      <TsSectionLabel>Account</TsSectionLabel>
      <TsCard style={styles.rowCard}>
        <Text style={styles.rowLabel}>
          {mode === 'signed_in'
            ? user?.email ?? 'Signed in'
            : 'Offline guest'}
        </Text>
        {mode === 'signed_in' ? (
          <Pressable onPress={() => void onSignOut()} disabled={signingOut}>
            {signingOut ? (
              <ActivityIndicator color={colors.sauce} />
            ) : (
              <Text style={styles.rowAction}>Sign out</Text>
            )}
          </Pressable>
        ) : (
          <Pressable onPress={() => router.push('/auth')}>
            <Text style={styles.rowAction}>Sign in</Text>
          </Pressable>
        )}
      </TsCard>

      <TsSectionLabel style={{ marginTop: 16 }}>Timer</TsSectionLabel>
      <TsCard style={styles.rowCard}>
        <Text style={styles.rowLabel}>Streak</Text>
        <Text style={styles.rowMuted}>
          {streakCount > 0 ? `${streakCount}-day` : 'None yet'}
        </Text>
      </TsCard>
      <TsCard style={[styles.rowCard, { marginTop: 8 }]}>
        <Text style={styles.rowLabel}>Streak freezes</Text>
        <Text style={styles.rowMuted}>
          {freezesAvailable} available
        </Text>
      </TsCard>
      <TsCard style={[styles.rowCard, { marginTop: 8 }]}>
        <Text style={styles.rowLabel}>Default style</Text>
        <Pressable onPress={() => setPickingStyle((v) => !v)}>
          <Text style={styles.rowMuted}>{styleLabel} ›</Text>
        </Pressable>
      </TsCard>
      {pickingStyle ? (
        <View style={styles.chips}>
          {STYLE_OPTIONS.map((opt) => (
            <TsChip
              key={opt.value}
              label={opt.label}
              icon={opt.icon}
              active={defaultStyle === opt.value}
              onPress={() => void onPickStyle(opt.value)}
            />
          ))}
        </View>
      ) : null}

      <TsCard style={[styles.rowCard, { marginTop: 8 }]}>
        <Text style={styles.rowLabel}>Sound & haptics</Text>
        <Switch
          value={soundOn}
          onValueChange={(v) => void onToggleSound(v)}
          trackColor={{ false: colors.border, true: colors.basil }}
          thumbColor={colors.cream}
        />
      </TsCard>

      <TsSectionLabel style={{ marginTop: 16 }}>Sync</TsSectionLabel>
      <TsCard>
        <Text style={styles.syncMeta}>
          {syncHint ??
            (mode === 'signed_in'
              ? 'Not synced yet'
              : 'Sign in to sync across devices')}
        </Text>
        {mode === 'signed_in' ? (
          <Pressable
            style={styles.syncBtn}
            onPress={() => void onSync()}
            disabled={syncing}>
            {syncing ? (
              <ActivityIndicator color={colors.ink} />
            ) : (
              <Text style={styles.syncBtnText}>Sync now</Text>
            )}
          </Pressable>
        ) : null}
      </TsCard>

      <Text style={styles.ghost}>Export data · Delete account</Text>
      <Text style={styles.comingSoon}>Coming soon</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.plate,
  },
  content: {
    paddingHorizontal: 20,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 26,
    color: colors.ink,
    marginBottom: 16,
  },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  rowLabel: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.ink,
    flex: 1,
    paddingRight: 12,
  },
  rowAction: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.sauce,
  },
  rowMuted: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.muted,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  syncMeta: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.muted,
  },
  syncBtn: {
    marginTop: 12,
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 100,
    alignItems: 'center',
  },
  syncBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.ink,
  },
  ghost: {
    marginTop: 28,
    textAlign: 'center',
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.muted,
    textDecorationLine: 'underline',
  },
  comingSoon: {
    marginTop: 4,
    textAlign: 'center',
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.muted,
    opacity: 0.7,
  },
});
