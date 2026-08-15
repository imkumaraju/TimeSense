jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: '/tmp/',
  EncodingType: { UTF8: 'utf8' },
  writeAsStringAsync: jest.fn(async () => {}),
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(async () => false),
  shareAsync: jest.fn(async () => {}),
}));

import { tasksToCsv } from '@/lib/exportTasksCsv';
import type { Task } from '@/types/task';

const sample: Task = {
  id: 'abc',
  userId: null,
  name: 'Clean, kitchen',
  description: null,
  category: 'chores',
  predictedSeconds: 1200,
  actualSeconds: 1500,
  visualStyle: 'pizza',
  startedAt: Date.parse('2026-01-15T12:00:00.000Z'),
  endedAt: Date.parse('2026-01-15T12:25:00.000Z'),
  moodTag: 'about_right',
  createdAt: Date.parse('2026-01-15T12:00:00.000Z'),
  updatedAt: Date.parse('2026-01-15T12:25:00.000Z'),
  synced: false,
};

describe('tasksToCsv', () => {
  it('escapes commas in names and formats rows', () => {
    const csv = tasksToCsv([sample]);
    const lines = csv.split('\n');
    expect(lines[0]).toContain('predicted_seconds');
    expect(lines[1]).toContain('"Clean, kitchen"');
    expect(lines[1]).toContain('1200');
    expect(lines[1]).toContain('1500');
  });

  it('handles empty list', () => {
    const csv = tasksToCsv([]);
    expect(csv.split('\n')).toHaveLength(1);
  });
});
