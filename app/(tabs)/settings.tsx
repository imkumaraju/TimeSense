import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { softDeleteOwnAccount } from '@/lib/accountLifecycle';
import { exportTasksCsv } from '@/lib/exportTasksCsv';
import {
  getDefaultVisualStyle,
  getSoundHapticsEnabled,
  setDefaultVisualStyle,
  setSoundHapticsEnabled,
} from '@/lib/settings';
import { cancelTimerNotifications } from '@/lib/timerFeedback';
import { getLastSyncedAt, syncNow } from '@/lib/syncService';
import { getStreakProfile } from '@/lib/streakService';
import { listRoutines } from '@/lib/routinesDb';
import { wipeLocalData } from '@/lib/tasksDb';
import { showManageSubscriptions } from '@/lib/purchases';
import { useProfile } from '@/lib/useProfile';
import { MAX_FREEZES } from '@/lib/streakLogic';
import { useAuthStore } from '@/stores/authStore';
import type { VisualStyle } from '@/types/task';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const mode = useAuthStore((s) => s.mode);
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const { isPlus, refresh: refreshProfile } = useProfile();

  const [defaultStyle, setDefaultStyle] = useState<VisualStyle>('pizza');
  const [soundOn, setSoundOn] = useState(true);
  const [syncHint, setSyncHint] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pickingStyle, setPickingStyle] = useState(false);
  const [streakCount, setStreakCount] = useState(0);
  const [freezesAvailable, setFreezesAvailable] = useState(2);
  const [routineCount, setRoutineCount] = useState(0);
  const [activeRoutineCount, setActiveRoutineCount] = useState(0);
  const [managingSubscription, setManagingSubscription] = useState(false);

  const reload = useCallback(async () => {
    setDefaultStyle(await getDefaultVisualStyle());
    setSoundOn(await getSoundHapticsEnabled());
    const profile = await getStreakProfile(user?.id ?? null);
    setStreakCount(profile?.streakCount ?? 0);
    setFreezesAvailable(profile?.freezesAvailable ?? 2);
    const routines = await listRoutines();
    setRoutineCount(routines.length);
    setActiveRoutineCount(routines.filter((r) => r.active).length);
    const last = await getLastSyncedAt();
    if (last) {
      setSyncHint(`Last synced ${new Date(last).toLocaleString()}`);
    }
    void refreshProfile();
  }, [user?.id, refreshProfile]);

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
    if (!value) {
      void cancelTimerNotifications();
    }
  };

  const onPickStyle = async (style: VisualStyle) => {
    setDefaultStyle(style);
    await setDefaultVisualStyle(style);
    setPickingStyle(false);
  };

  const onManageSubscription = async () => {
    setManagingSubscription(true);
    try {
      await showManageSubscriptions();
    } catch (e) {
      Alert.alert(
        'Could not open subscription management',
        e instanceof Error ? e.message : 'Please try again.',
      );
    } finally {
      setManagingSubscription(false);
    }
  };

  const onExport = async () => {
    setExporting(true);
    try {
      const result = await exportTasksCsv();
      if (!result.ok) {
        Alert.alert('Export failed', result.error ?? 'Could not export.');
      }
    } catch (e) {
      Alert.alert(
        'Export failed',
        e instanceof Error ? e.message : 'Could not export.',
      );
    } finally {
      setExporting(false);
    }
  };

  const runDeleteOrClear = async () => {
    setDeleting(true);
    try {
      if (mode === 'signed_in') {
        const result = await softDeleteOwnAccount();
        if (!result.ok) {
          Alert.alert('Could not delete account', result.error ?? 'Try again.');
          return;
        }
      } else {
        await wipeLocalData();
        await cancelTimerNotifications();
      }
      await signOut();
      router.replace('/');
    } catch (e) {
      Alert.alert(
        'Something went wrong',
        e instanceof Error ? e.message : 'Please try again.',
      );
    } finally {
      setDeleting(false);
    }
  };

  const onDeleteOrClear = () => {
    const signedIn = mode === 'signed_in';
    Alert.alert(
      signedIn ? 'Delete account?' : 'Clear local data?',
      signedIn
        ? 'Your account will be deactivated and removed from this device. Signing in again later starts fresh (previous timers are cleared from your account when you return).'
        : 'This removes all timers stored on this device. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: signedIn ? 'Delete' : 'Clear',
          style: 'destructive',
          onPress: () => void runDeleteOrClear(),
        },
      ],
    );
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
      {!isPlus ? (
        <Pressable onPress={() => router.push('/paywall')}>
          <TsCard style={[styles.rowCard, styles.rowCardUpsell, { marginTop: 8 }]}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={styles.rowLabelOnDark}>Upgrade to Plus</Text>
              <Text style={styles.rowSubOnDark}>No ads · all styles · priority sync</Text>
            </View>
            <Text style={styles.rowLabelOnDark}>›</Text>
          </TsCard>
        </Pressable>
      ) : (
        <TsCard style={[styles.rowCard, { marginTop: 8 }]}>
          <Text style={styles.rowLabel}>Manage subscription</Text>
          <Pressable onPress={() => void onManageSubscription()} disabled={managingSubscription}>
            {managingSubscription ? (
              <ActivityIndicator color={colors.sauce} />
            ) : (
              <Text style={styles.rowAction}>Manage ›</Text>
            )}
          </Pressable>
        </TsCard>
      )}
      {!isPlus && freezesAvailable < MAX_FREEZES ? (
        <TsCard style={[styles.rowCard, styles.rowCardDisabled, { marginTop: 8 }]}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={styles.rowLabelMuted}>Watch an ad for a streak freeze</Text>
            <Text style={styles.rowSubMuted}>Coming soon</Text>
          </View>
        </TsCard>
      ) : null}
      <TsCard style={[styles.rowCard, { marginTop: 8 }]}>
        <Text style={styles.rowLabel}>Default style</Text>
        <Pressable onPress={() => setPickingStyle((v) => !v)}>
          <Text style={styles.rowMuted}>{styleLabel} ›</Text>
        </Pressable>
      </TsCard>
      {routineCount > 0 ? (
        <TsCard style={[styles.rowCard, { marginTop: 8 }]}>
          <Text style={styles.rowLabel}>Routines</Text>
          <Pressable onPress={() => router.push('/routines')}>
            <Text style={styles.rowMuted}>{activeRoutineCount} active ›</Text>
          </Pressable>
        </TsCard>
      ) : null}
      {pickingStyle ? (
        <View style={styles.chips}>
          {STYLE_OPTIONS.map((opt) => {
            const locked = opt.premium && !isPlus;
            return (
              <TsChip
                key={opt.value}
                label={opt.label}
                icon={opt.icon}
                active={defaultStyle === opt.value}
                locked={locked}
                onPress={() => {
                  if (locked) {
                    router.push('/paywall');
                    return;
                  }
                  void onPickStyle(opt.value);
                }}
              />
            );
          })}
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

      <TsSectionLabel style={{ marginTop: 16 }}>Data</TsSectionLabel>
      <TsCard style={styles.rowCard}>
        <Text style={styles.rowLabel}>Export CSV</Text>
        <Pressable onPress={() => void onExport()} disabled={exporting}>
          {exporting ? (
            <ActivityIndicator color={colors.sauce} />
          ) : (
            <Text style={styles.rowAction}>Share</Text>
          )}
        </Pressable>
      </TsCard>
      <TsCard style={[styles.rowCard, { marginTop: 8 }]}>
        <Text style={styles.rowLabel}>
          {mode === 'signed_in' ? 'Delete account' : 'Clear local data'}
        </Text>
        <Pressable onPress={onDeleteOrClear} disabled={deleting}>
          {deleting ? (
            <ActivityIndicator color={colors.sauce} />
          ) : (
            <Text style={[styles.rowAction, styles.danger]}>
              {mode === 'signed_in' ? 'Delete' : 'Clear'}
            </Text>
          )}
        </Pressable>
      </TsCard>

      <TsSectionLabel style={{ marginTop: 16 }}>Legal</TsSectionLabel>
      <TsCard style={styles.rowCard}>
        <Text style={styles.rowLabel}>Privacy Policy</Text>
        <Pressable onPress={() => router.push('/legal/privacy')}>
          <Text style={styles.rowAction}>View ›</Text>
        </Pressable>
      </TsCard>
      <TsCard style={[styles.rowCard, { marginTop: 8 }]}>
        <Text style={styles.rowLabel}>Terms & Conditions</Text>
        <Pressable onPress={() => router.push('/legal/terms')}>
          <Text style={styles.rowAction}>View ›</Text>
        </Pressable>
      </TsCard>
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
  rowCardUpsell: {
    backgroundColor: colors.crust,
    borderColor: colors.crust,
  },
  rowCardDisabled: {
    opacity: 0.6,
  },
  rowLabelOnDark: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.cream,
  },
  rowSubOnDark: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.cream,
    opacity: 0.85,
    marginTop: 2,
  },
  rowLabelMuted: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.muted,
  },
  rowSubMuted: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
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
  danger: {
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
});
