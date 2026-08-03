import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  markShowcaseShownToday,
  shouldShowShowcaseToday,
} from '@/lib/showcaseGate';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

const mocked = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('showcaseGate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows when never shown', async () => {
    mocked.getItem.mockResolvedValue(null);
    await expect(
      shouldShowShowcaseToday(new Date(2026, 7, 2)),
    ).resolves.toBe(true);
  });

  it('hides when already shown today', async () => {
    mocked.getItem.mockResolvedValue('2026-08-02');
    await expect(
      shouldShowShowcaseToday(new Date(2026, 7, 2)),
    ).resolves.toBe(false);
  });

  it('shows again on a new calendar day', async () => {
    mocked.getItem.mockResolvedValue('2026-08-01');
    await expect(
      shouldShowShowcaseToday(new Date(2026, 7, 2)),
    ).resolves.toBe(true);
  });

  it('marks today as shown', async () => {
    await markShowcaseShownToday(new Date(2026, 7, 2));
    expect(mocked.setItem).toHaveBeenCalledWith(
      'timesense.showcase.last_shown_date',
      '2026-08-02',
    );
  });
});
