import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { PurchasesOffering, PurchasesPackage } from 'react-native-purchases';

import { TsButton } from '@/components/ui/TsButton';
import { colors, fonts } from '@/constants/theme';
import { getCurrentOffering, purchasePlus, restorePurchases } from '@/lib/purchases';
import { useProfile } from '@/lib/useProfile';

// Ads-on-finish is the only thing Plus removes — see docs/concepts/feature-subscription-ads.md.
const FEATURES = ['No ads when you finish a timer'];

type Plan = 'monthly' | 'annual';

export default function PaywallScreen() {
  const insets = useSafeAreaInsets();
  const { refresh } = useProfile();

  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [loadingOffering, setLoadingOffering] = useState(true);
  const [plan, setPlan] = useState<Plan>('annual');
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void getCurrentOffering().then((current) => {
      if (!cancelled) {
        setOffering(current);
        setLoadingOffering(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const monthlyPkg: PurchasesPackage | null = offering?.monthly ?? null;
  const annualPkg: PurchasesPackage | null = offering?.annual ?? null;
  const selectedPkg = plan === 'monthly' ? monthlyPkg : annualPkg;
  const plansUnavailable = !loadingOffering && !selectedPkg;

  const onContinue = async () => {
    if (purchasing) return;
    setPurchasing(true);
    try {
      await purchasePlus(plan);
      await refresh();
      Alert.alert('Welcome to Plus', "You won't see ads when you finish a timer anymore.");
      router.back();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not complete purchase.';
      // RevenueCat rejects with userCancelled on a cancelled sheet — don't show an error for that.
      if (!/cancel/i.test(message)) {
        Alert.alert('Purchase failed', message);
      }
    } finally {
      setPurchasing(false);
    }
  };

  const onRestore = async () => {
    if (restoring) return;
    setRestoring(true);
    try {
      await restorePurchases();
      await refresh();
      Alert.alert('Purchases restored', 'Your entitlement has been refreshed.');
      router.back();
    } catch (e) {
      Alert.alert(
        'Restore failed',
        e instanceof Error ? e.message : 'Could not restore purchases.',
      );
    } finally {
      setRestoring(false);
    }
  };

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 20 },
      ]}>
      <View style={styles.hero}>
        <View style={styles.mascot} />
        <Text style={styles.title}>TimeSense Plus</Text>
        <Text style={styles.subtitle}>Go ad-free</Text>
      </View>

      <View style={styles.features}>
        {FEATURES.map((f) => (
          <View key={f} style={styles.featureRow}>
            <View style={styles.check}>
              <Text style={styles.checkMark}>✓</Text>
            </View>
            <Text style={styles.featureText}>{f}</Text>
          </View>
        ))}
      </View>

      {loadingOffering ? (
        <ActivityIndicator color={colors.sauce} style={{ marginVertical: 20 }} />
      ) : (
        <View style={styles.planRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: plan === 'monthly' }}
            onPress={() => setPlan('monthly')}
            style={[styles.planCard, plan === 'monthly' && styles.planCardActive]}>
            <Text style={styles.planPrice}>{monthlyPkg?.product.priceString ?? '$10.00'}</Text>
            <Text style={styles.planPeriod}>per month</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: plan === 'annual' }}
            onPress={() => setPlan('annual')}
            style={[styles.planCard, plan === 'annual' && styles.planCardActive]}>
            <Text style={styles.badge}>2 MONTHS FREE</Text>
            <Text style={styles.planPrice}>{annualPkg?.product.priceString ?? '$100.00'}</Text>
            <Text style={styles.planPeriod}>per year</Text>
          </Pressable>
        </View>
      )}

      {plansUnavailable && (
        <Text style={styles.unavailableText}>
          Plans aren't available right now. Check your connection and try again.
        </Text>
      )}

      <View style={{ flex: 1 }} />

      <TsButton
        label={purchasing ? 'Purchasing…' : 'Continue'}
        block
        disabled={purchasing || plansUnavailable}
        onPress={() => void onContinue()}
      />
      <TsButton
        label={restoring ? 'Restoring…' : 'Restore purchase'}
        variant="ghost"
        disabled={restoring}
        onPress={() => void onRestore()}
        style={{ alignSelf: 'center', marginTop: 4 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.plate,
    paddingHorizontal: 24,
  },
  hero: {
    backgroundColor: colors.crust,
    borderRadius: 18,
    paddingVertical: 22,
    alignItems: 'center',
    marginBottom: 18,
  },
  mascot: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.cream,
    marginBottom: 10,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: colors.cream,
  },
  subtitle: {
    marginTop: 2,
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.cream,
    opacity: 0.9,
  },
  features: {
    marginBottom: 18,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.basil,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    color: colors.cream,
    fontSize: 12,
    fontFamily: fonts.bodyBold,
  },
  featureText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.ink,
  },
  planRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  planCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.cream,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
  },
  planCardActive: {
    borderColor: colors.crust,
    backgroundColor: colors.insightCard,
  },
  badge: {
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    color: colors.cream,
    backgroundColor: colors.basil,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    marginBottom: 6,
    overflow: 'hidden',
  },
  planPrice: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.ink,
  },
  planPeriod: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.muted,
  },
  unavailableText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: 8,
  },
});
