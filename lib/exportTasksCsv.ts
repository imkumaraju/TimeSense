/**
 * Export local tasks as CSV and open the system share sheet.
 */

import {
  cacheDirectory,
  EncodingType,
  writeAsStringAsync,
} from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { listRecentTasks } from '@/lib/tasksDb';
import type { Task } from '@/types/task';

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function tasksToCsv(tasks: Task[]): string {
  const header = [
    'id',
    'name',
    'category',
    'predicted_seconds',
    'actual_seconds',
    'mood_tag',
    'started_at',
    'ended_at',
  ].join(',');

  const lines = tasks.map((t) =>
    [
      csvEscape(t.id),
      csvEscape(t.name),
      csvEscape(t.category ?? ''),
      String(t.predictedSeconds),
      t.actualSeconds == null ? '' : String(t.actualSeconds),
      csvEscape(t.moodTag ?? ''),
      new Date(t.startedAt).toISOString(),
      t.endedAt == null ? '' : new Date(t.endedAt).toISOString(),
    ].join(','),
  );

  return [header, ...lines].join('\n');
}

export async function exportTasksCsv(): Promise<{ ok: boolean; error?: string }> {
  const tasks = await listRecentTasks(10_000);
  const csv = tasksToCsv(tasks);
  if (!cacheDirectory) {
    return { ok: false, error: 'File system unavailable on this platform.' };
  }

  const path = `${cacheDirectory}timesense-tasks-${Date.now()}.csv`;
  await writeAsStringAsync(path, csv, {
    encoding: EncodingType.UTF8,
  });

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    return { ok: false, error: 'Sharing is not available on this device.' };
  }

  await Sharing.shareAsync(path, {
    mimeType: 'text/csv',
    dialogTitle: 'Export TimeSense tasks',
    UTI: 'public.comma-separated-values-text',
  });
  return { ok: true };
}
