// Shared source for the in-app Privacy Policy / Terms screens (app/legal/*.tsx).
// The public GitHub Pages copies under docs/legal/*.html are hand-mirrored from this —
// update both when the wording changes.

export const LEGAL_LAST_UPDATED = 'August 15, 2026';
export const LEGAL_CONTACT_EMAIL = 'imkumaraju@gmail.com';

export type LegalSection = {
  heading: string;
  body: string;
};

export const PRIVACY_POLICY_SECTIONS: LegalSection[] = [
  {
    heading: 'Overview',
    body: `TimeSense ("the app", "we", "us") is a personal time-estimation and focus-timer app. This policy explains what data the app collects, how it's used, and how you can control or delete it.`,
  },
  {
    heading: 'Guest mode (offline)',
    body: `By default TimeSense runs in guest mode: your tasks, timers, routines, and settings are stored only on your device (local SQLite storage). Nothing is sent to us or any third party unless you choose to sign in.`,
  },
  {
    heading: 'What we collect if you sign in',
    body: `Signing in (Google, Apple, or email) is optional and enables syncing across your devices. If you sign in, we store:
• Your account email address (used for authentication)
• The task, timer, and routine data you create in the app (name/category are optional, predicted vs. actual durations, timestamps)
• A device-local notification schedule for routine reminders — this stays on your device and is never synced or uploaded.

We do not collect analytics, advertising identifiers, or usage tracking data. The app has no ads and no third-party analytics or crash-reporting SDKs.`,
  },
  {
    heading: 'How your data is stored',
    body: `Signed-in data is stored using Supabase (a hosted PostgreSQL database provider) over an encrypted connection. Data is used solely to sync your own tasks and timers across your own devices — we do not sell, share, or use your data for advertising.`,
  },
  {
    heading: 'Insights',
    body: `The Insights screen (predicted-vs-actual duration trends) is computed entirely on your device from your local data. Insight statistics are never stored on our servers or shared.`,
  },
  {
    heading: 'Data deletion',
    body: `You can delete your account at any time from Settings → Delete account. This deactivates and removes your account data. If you're using guest mode, Settings → Clear local data removes everything stored on your device. Both actions are irreversible.`,
  },
  {
    heading: "Children's privacy",
    body: `TimeSense is not directed at children under 13, and we do not knowingly collect data from children under 13.`,
  },
  {
    heading: 'Changes to this policy',
    body: `If this policy changes, the "Last updated" date below will change. Material changes will be reflected here before they take effect.`,
  },
  {
    heading: 'Contact',
    body: `Questions or data requests: ${LEGAL_CONTACT_EMAIL}`,
  },
];

export const TERMS_SECTIONS: LegalSection[] = [
  {
    heading: 'Acceptance of terms',
    body: `By using TimeSense, you agree to these terms. If you don't agree, please don't use the app.`,
  },
  {
    heading: 'What the app does',
    body: `TimeSense is a personal productivity tool: a visual timer and a time-estimation log intended to help you build awareness of how long tasks actually take. It is not a medical device and does not provide medical, psychological, or clinical advice — it's a self-tracking tool.`,
  },
  {
    heading: 'Accounts',
    body: `You may use TimeSense without an account (guest mode). Creating an account is optional and used only to sync your own data across your own devices. You're responsible for keeping your account credentials secure.`,
  },
  {
    heading: 'Acceptable use',
    body: `Use the app only for its intended personal-productivity purpose. Don't attempt to disrupt, reverse-engineer for malicious purposes, or abuse the backend infrastructure.`,
  },
  {
    heading: 'Your data',
    body: `You own the task, timer, and routine data you create. See the Privacy Policy for how it's stored and how to delete it.`,
  },
  {
    heading: 'No warranty',
    body: `TimeSense is provided "as is," without warranties of any kind. We don't guarantee the app will be uninterrupted, error-free, or fit for any particular purpose.`,
  },
  {
    heading: 'Limitation of liability',
    body: `To the maximum extent permitted by law, we are not liable for any indirect, incidental, or consequential damages arising from your use of the app.`,
  },
  {
    heading: 'Changes to the service or terms',
    body: `We may update the app or these terms over time. Continued use after an update means you accept the revised terms. The "Last updated" date below reflects the latest revision.`,
  },
  {
    heading: 'Termination',
    body: `You may stop using the app and delete your account at any time (Settings → Delete account). We may suspend access for accounts that violate these terms.`,
  },
  {
    heading: 'Contact',
    body: `Questions: ${LEGAL_CONTACT_EMAIL}`,
  },
];
