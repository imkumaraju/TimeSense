import { isPlus } from '@/lib/entitlements';
import type { Profile } from '@/types/task';

function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 'u1',
    email: null,
    displayName: null,
    username: null,
    firstName: null,
    lastName: null,
    timezone: null,
    defaultVisualStyle: 'pizza',
    streakCount: 0,
    freezesAvailable: 2,
    lastActiveDate: null,
    deletedAt: null,
    subscriptionTier: 'standard',
    subscriptionExpiresAt: null,
    ...overrides,
  };
}

describe('isPlus', () => {
  it('is false for a null profile', () => {
    expect(isPlus(null)).toBe(false);
  });

  it('is false for standard tier', () => {
    expect(isPlus(makeProfile({ subscriptionTier: 'standard' }))).toBe(false);
  });

  it('is true for plus tier with no expiry (lifetime/non-expiring)', () => {
    expect(
      isPlus(makeProfile({ subscriptionTier: 'plus', subscriptionExpiresAt: null })),
    ).toBe(true);
  });

  it('is true for plus tier with a future expiry', () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    expect(
      isPlus(makeProfile({ subscriptionTier: 'plus', subscriptionExpiresAt: future })),
    ).toBe(true);
  });

  it('is false for plus tier with a past expiry', () => {
    const past = new Date(Date.now() - 86_400_000).toISOString();
    expect(
      isPlus(makeProfile({ subscriptionTier: 'plus', subscriptionExpiresAt: past })),
    ).toBe(false);
  });
});
