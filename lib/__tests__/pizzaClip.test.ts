import {
  isInRemainingPizza,
  pizzaStatusLabel,
  remainingPizzaPath,
} from '@/lib/pizzaClip';

describe('remainingPizzaPath', () => {
  it('returns empty path when progress is 0 (fully eaten)', () => {
    expect(remainingPizzaPath(100, 100, 50, 0)).toBe('');
  });

  it('returns a full double-arc circle when progress is 1', () => {
    const d = remainingPizzaPath(100, 100, 50, 1);
    expect(d).toContain('A 50 50');
    expect(d.endsWith('Z')).toBe(true);
  });

  it('returns a sector path for partial progress', () => {
    const d = remainingPizzaPath(100, 100, 50, 0.5);
    expect(d.startsWith('M 100 100')).toBe(true);
    expect(d).toContain('A 50 50');
    expect(d.endsWith('Z')).toBe(true);
  });
});

describe('isInRemainingPizza', () => {
  it('keeps 12 o\'clock point when almost full, drops it after eating past noon', () => {
    // Point at 12 o'clock
    expect(isInRemainingPizza(100, 50, 100, 100, 1)).toBe(true);
    // After 25% eaten clockwise from 12, noon is gone
    expect(isInRemainingPizza(100, 50, 100, 100, 0.75)).toBe(false);
    // 3 o'clock still remaining at 75% left
    expect(isInRemainingPizza(150, 100, 100, 100, 0.75)).toBe(true);
  });
});

describe('pizzaStatusLabel', () => {
  it('labels stages without judgment', () => {
    expect(pizzaStatusLabel(1)).toBe('Total time');
    expect(pizzaStatusLabel(0.5)).toBe('Half-time');
    expect(pizzaStatusLabel(0.05)).toBe('Almost done');
    expect(pizzaStatusLabel(0)).toBe('All gone');
  });
});
