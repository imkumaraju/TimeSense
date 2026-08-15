import { LegalScreen } from '@/components/legal/LegalScreen';
import { TERMS_SECTIONS } from '@/lib/legalContent';

export default function TermsScreen() {
  return <LegalScreen title="Terms & Conditions" sections={TERMS_SECTIONS} />;
}
