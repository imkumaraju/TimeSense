import {
  displayNameFromParts,
  namesFromUserMetadata,
} from '@/lib/userNames';

describe('namesFromUserMetadata', () => {
  it('reads email-signup fields', () => {
    const n = namesFromUserMetadata({
      username: 'ada',
      first_name: 'Ada',
      last_name: 'Lovelace',
    });
    expect(n.username).toBe('ada');
    expect(n.firstName).toBe('Ada');
    expect(n.lastName).toBe('Lovelace');
    expect(n.displayName).toBe('Ada Lovelace');
  });

  it('reads Google given_name / family_name', () => {
    const n = namesFromUserMetadata({
      given_name: 'Ada',
      family_name: 'Lovelace',
      email: 'ada@example.com',
      picture: 'https://example.com/p.png',
    });
    expect(n.firstName).toBe('Ada');
    expect(n.lastName).toBe('Lovelace');
  });
});

describe('displayNameFromParts', () => {
  it('joins first and last', () => {
    expect(displayNameFromParts('Ada', 'Lovelace')).toBe('Ada Lovelace');
    expect(displayNameFromParts('Ada', null)).toBe('Ada');
    expect(displayNameFromParts(null, null, 'fallback')).toBe('fallback');
  });
});
