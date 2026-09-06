import { Redirect } from 'expo-router';

/**
 * Entry gate — straight to Home. Used to conditionally show a once-daily style showcase
 * screen (removed 2026-09-06, see docs/concepts/first-launch-showcase.md); kept as its own
 * route in case a real first-open/onboarding flow is added here again later.
 */
export default function IndexGate() {
  return <Redirect href="/(tabs)" />;
}
