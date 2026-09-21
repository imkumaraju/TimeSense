import { interstitialIsDue, snapshotFromConsentInfo } from '@/lib/ads';

describe('snapshotFromConsentInfo', () => {
  it('marks privacy options required only for REQUIRED', () => {
    expect(
      snapshotFromConsentInfo({
        canRequestAds: true,
        privacyOptionsRequirementStatus: 'REQUIRED',
      }),
    ).toEqual({ canRequestAds: true, isPrivacyOptionsRequired: true });
  });

  it('treats NOT_REQUIRED and UNKNOWN as no privacy-options row', () => {
    expect(
      snapshotFromConsentInfo({
        canRequestAds: true,
        privacyOptionsRequirementStatus: 'NOT_REQUIRED',
      }).isPrivacyOptionsRequired,
    ).toBe(false);
    expect(
      snapshotFromConsentInfo({
        canRequestAds: false,
        privacyOptionsRequirementStatus: 'UNKNOWN',
      }).isPrivacyOptionsRequired,
    ).toBe(false);
  });
});

describe('interstitialIsDue', () => {
  it('skips Plus and web even when consent would allow ads', () => {
    expect(
      interstitialIsDue({ isPlus: true, platform: 'android', canRequestAds: true }),
    ).toBe(false);
    expect(
      interstitialIsDue({ isPlus: false, platform: 'web', canRequestAds: true }),
    ).toBe(false);
  });

  it('skips when UMP has not allowed ads yet', () => {
    expect(
      interstitialIsDue({ isPlus: false, platform: 'android', canRequestAds: false }),
    ).toBe(false);
  });

  it('is due for a standard native user after consent allows ads', () => {
    expect(
      interstitialIsDue({ isPlus: false, platform: 'android', canRequestAds: true }),
    ).toBe(true);
    expect(
      interstitialIsDue({ isPlus: false, platform: 'ios', canRequestAds: true }),
    ).toBe(true);
  });
});
