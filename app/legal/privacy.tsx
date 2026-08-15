import { LegalScreen } from '@/components/legal/LegalScreen';
import { PRIVACY_POLICY_SECTIONS } from '@/lib/legalContent';

export default function PrivacyPolicyScreen() {
  return <LegalScreen title="Privacy Policy" sections={PRIVACY_POLICY_SECTIONS} />;
}
