import {
  expoWeekdayToJs,
  isDueOnDate,
  isPastEndDate,
  jsWeekdayToExpo,
  localDateString,
  parseRecurrenceDays,
} from '@/lib/routineLogic';

describe('parseRecurrenceDays / serialize', () => {
  it('parses and dedupes', () => {
    expect(parseRecurrenceDays('5,1,5,0')).toEqual([0, 1, 5]);
  });
});

describe('weekday mapping', () => {
  it('round-trips Sun..Sat', () => {
    for (let d = 0; d <= 6; d++) {
      expect(expoWeekdayToJs(jsWeekdayToExpo(d))).toBe(d);
    }
  });
  it('maps Friday 5 → expo 6', () => {
    expect(jsWeekdayToExpo(5)).toBe(6);
  });
});

describe('isDueOnDate', () => {
  const fri = new Date(2026, 7, 7, 12, 0, 0);

  it('matches weekday inside date window', () => {
    expect(
      isDueOnDate(
        {
          active: true,
          recurrenceDays: '5',
          startDate: '2026-08-01',
          endDate: null,
        },
        fri,
      ),
    ).toBe(true);
  });

  it('rejects inactive or wrong day', () => {
    expect(
      isDueOnDate(
        {
          active: false,
          recurrenceDays: '5',
          startDate: '2026-08-01',
          endDate: null,
        },
        fri,
      ),
    ).toBe(false);
    expect(
      isDueOnDate(
        {
          active: true,
          recurrenceDays: '1',
          startDate: '2026-08-01',
          endDate: null,
        },
        fri,
      ),
    ).toBe(false);
  });

  it('respects end_date', () => {
    expect(
      isDueOnDate(
        {
          active: true,
          recurrenceDays: '5',
          startDate: '2026-07-01',
          endDate: '2026-08-06',
        },
        fri,
      ),
    ).toBe(false);
  });
});

describe('isPastEndDate', () => {
  it('detects day after end', () => {
    expect(isPastEndDate('2026-08-07', new Date(2026, 7, 8))).toBe(true);
    expect(isPastEndDate('2026-08-07', new Date(2026, 7, 7))).toBe(false);
    expect(isPastEndDate(null, new Date(2026, 7, 8))).toBe(false);
  });
});

describe('localDateString', () => {
  it('formats YYYY-MM-DD', () => {
    expect(localDateString(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});
