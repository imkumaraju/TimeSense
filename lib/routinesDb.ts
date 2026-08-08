/**
 * Local persistence for recurring routines + notification ID map.
 * Reuses tasksDb init / SQLite vs AsyncStorage split.
 */

import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  isDueOnDate,
  isPastEndDate,
  localDateString,
  serializeRecurrenceDays,
} from '@/lib/routineLogic';
import { initTasksDb } from '@/lib/tasksDb';
import type {
  NewRoutineInput,
  Routine,
  RoutineNotification,
  TaskCategory,
  VisualStyle,
} from '@/types/task';

const WEB_ROUTINES_KEY = 'timesense.routines.v1';
const WEB_ROUTINE_NOTIFS_KEY = 'timesense.routine_notifications.v1';

type RoutineRow = {
  id: string;
  user_id: string | null;
  name: string;
  category: string | null;
  predicted_seconds: number;
  visual_style: string;
  recurrence_days: string;
  reminder_hour: number;
  reminder_minute: number;
  start_date: string;
  end_date: string | null;
  active: number;
  created_at: number;
  updated_at: number;
  synced: number;
};

function rowToRoutine(row: RoutineRow): Routine {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    category: row.category as TaskCategory | null,
    predictedSeconds: row.predicted_seconds,
    visualStyle: row.visual_style as VisualStyle,
    recurrenceDays: row.recurrence_days,
    reminderHour: row.reminder_hour,
    reminderMinute: row.reminder_minute,
    startDate: row.start_date,
    endDate: row.end_date,
    active: row.active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    synced: row.synced === 1,
  };
}

async function getSqlite() {
  await initTasksDb();
  // Re-open via tasksDb's path: import private helper by opening again
  const Constants = await import('expo-constants');
  const { Platform } = await import('react-native');
  const useAsync =
    Platform.OS === 'web' || Constants.default.appOwnership === 'expo';
  if (useAsync) return null;
  try {
    const SQLite = await import('expo-sqlite');
    const db = SQLite.openDatabaseSync('timesense.db');
    return db;
  } catch {
    return null;
  }
}

async function readAsyncRoutines(): Promise<Routine[]> {
  const raw = await AsyncStorage.getItem(WEB_ROUTINES_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Routine[];
  } catch {
    return [];
  }
}

async function writeAsyncRoutines(rows: Routine[]): Promise<void> {
  await AsyncStorage.setItem(WEB_ROUTINES_KEY, JSON.stringify(rows));
}

async function readAsyncNotifs(): Promise<RoutineNotification[]> {
  const raw = await AsyncStorage.getItem(WEB_ROUTINE_NOTIFS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as RoutineNotification[];
  } catch {
    return [];
  }
}

async function writeAsyncNotifs(rows: RoutineNotification[]): Promise<void> {
  await AsyncStorage.setItem(WEB_ROUTINE_NOTIFS_KEY, JSON.stringify(rows));
}

function nudgeSync() {
  void import('@/lib/syncService')
    .then(({ syncNow }) => syncNow())
    .catch(() => {});
}

export async function createRoutine(input: NewRoutineInput): Promise<Routine> {
  const now = Date.now();
  const days = serializeRecurrenceDays(input.recurrenceDays);
  if (!days) {
    throw new Error('Pick at least one day for the routine.');
  }
  const routine: Routine = {
    id: Crypto.randomUUID(),
    userId: input.userId ?? null,
    name: input.name.trim() || 'Routine',
    category: input.category ?? null,
    predictedSeconds: input.predictedSeconds,
    visualStyle: input.visualStyle ?? 'pizza',
    recurrenceDays: days,
    reminderHour: input.reminderHour,
    reminderMinute: input.reminderMinute,
    startDate: input.startDate ?? localDateString(),
    endDate: input.endDate ?? null,
    active: true,
    createdAt: now,
    updatedAt: now,
    synced: false,
  };
  await upsertLocalRoutine(routine);
  nudgeSync();
  return routine;
}

export async function upsertLocalRoutine(routine: Routine): Promise<void> {
  const db = await getSqlite();
  if (db) {
    db.runSync(
      `INSERT INTO routines (
        id, user_id, name, category, predicted_seconds, visual_style, recurrence_days,
        reminder_hour, reminder_minute, start_date, end_date, active, created_at, updated_at, synced
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        user_id = excluded.user_id,
        name = excluded.name,
        category = excluded.category,
        predicted_seconds = excluded.predicted_seconds,
        visual_style = excluded.visual_style,
        recurrence_days = excluded.recurrence_days,
        reminder_hour = excluded.reminder_hour,
        reminder_minute = excluded.reminder_minute,
        start_date = excluded.start_date,
        end_date = excluded.end_date,
        active = excluded.active,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at,
        synced = excluded.synced`,
      [
        routine.id,
        routine.userId,
        routine.name,
        routine.category,
        routine.predictedSeconds,
        routine.visualStyle,
        routine.recurrenceDays,
        routine.reminderHour,
        routine.reminderMinute,
        routine.startDate,
        routine.endDate,
        routine.active ? 1 : 0,
        routine.createdAt,
        routine.updatedAt,
        routine.synced ? 1 : 0,
      ],
    );
    return;
  }
  const rows = await readAsyncRoutines();
  const idx = rows.findIndex((r) => r.id === routine.id);
  if (idx >= 0) rows[idx] = routine;
  else rows.unshift(routine);
  await writeAsyncRoutines(rows);
}

export async function listRoutines(): Promise<Routine[]> {
  const db = await getSqlite();
  if (db) {
    const rows = db.getAllSync<RoutineRow>(
      `SELECT * FROM routines ORDER BY updated_at DESC`,
    );
    return rows.map(rowToRoutine);
  }
  return readAsyncRoutines();
}

export async function listActiveRoutinesDueToday(
  on: Date = new Date(),
): Promise<Routine[]> {
  const all = await listRoutines();
  return all.filter((r) => isDueOnDate(r, on));
}

export async function getRoutineById(id: string): Promise<Routine | null> {
  const db = await getSqlite();
  if (db) {
    const row = db.getFirstSync<RoutineRow>(
      `SELECT * FROM routines WHERE id = ?`,
      [id],
    );
    return row ? rowToRoutine(row) : null;
  }
  return (await readAsyncRoutines()).find((r) => r.id === id) ?? null;
}

export async function listUnsyncedRoutines(): Promise<Routine[]> {
  const db = await getSqlite();
  if (db) {
    const rows = db.getAllSync<RoutineRow>(
      `SELECT * FROM routines WHERE synced = 0 ORDER BY updated_at ASC`,
    );
    return rows.map(rowToRoutine);
  }
  return (await readAsyncRoutines()).filter((r) => !r.synced);
}

export async function markRoutinesSynced(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const db = await getSqlite();
  if (db) {
    for (const id of ids) {
      db.runSync(`UPDATE routines SET synced = 1 WHERE id = ?`, [id]);
    }
    return;
  }
  const rows = await readAsyncRoutines();
  await writeAsyncRoutines(
    rows.map((r) => (ids.includes(r.id) ? { ...r, synced: true } : r)),
  );
}

export async function setRoutineActive(
  id: string,
  active: boolean,
): Promise<Routine | null> {
  const existing = await getRoutineById(id);
  if (!existing) return null;
  const next: Routine = {
    ...existing,
    active,
    updatedAt: Date.now(),
    synced: false,
  };
  await upsertLocalRoutine(next);
  nudgeSync();
  return next;
}

export async function deleteRoutineLocal(id: string): Promise<void> {
  const db = await getSqlite();
  if (db) {
    db.runSync(`DELETE FROM routine_notifications WHERE routine_id = ?`, [id]);
    db.runSync(`DELETE FROM routines WHERE id = ?`, [id]);
    return;
  }
  await writeAsyncRoutines(
    (await readAsyncRoutines()).filter((r) => r.id !== id),
  );
  await writeAsyncNotifs(
    (await readAsyncNotifs()).filter((n) => n.routineId !== id),
  );
}

/** Soft-delete / wipe: remove all local routines + notif maps. */
export async function wipeLocalRoutines(): Promise<void> {
  const db = await getSqlite();
  if (db) {
    db.execSync(`
      DELETE FROM routine_notifications;
      DELETE FROM routines;
    `);
  }
  await AsyncStorage.multiRemove([WEB_ROUTINES_KEY, WEB_ROUTINE_NOTIFS_KEY]);
}

export async function replaceRoutineNotifications(
  routineId: string,
  entries: Array<{ weekday: number; notificationId: string }>,
): Promise<void> {
  const db = await getSqlite();
  if (db) {
    db.runSync(`DELETE FROM routine_notifications WHERE routine_id = ?`, [
      routineId,
    ]);
    for (const e of entries) {
      db.runSync(
        `INSERT INTO routine_notifications (routine_id, weekday, notification_id)
         VALUES (?, ?, ?)`,
        [routineId, e.weekday, e.notificationId],
      );
    }
    return;
  }
  const others = (await readAsyncNotifs()).filter(
    (n) => n.routineId !== routineId,
  );
  await writeAsyncNotifs([
    ...others,
    ...entries.map((e) => ({
      routineId,
      weekday: e.weekday,
      notificationId: e.notificationId,
    })),
  ]);
}

export async function listRoutineNotifications(
  routineId?: string,
): Promise<RoutineNotification[]> {
  const db = await getSqlite();
  if (db) {
    if (routineId) {
      return db
        .getAllSync<{
          routine_id: string;
          weekday: number;
          notification_id: string;
        }>(
          `SELECT * FROM routine_notifications WHERE routine_id = ?`,
          [routineId],
        )
        .map((r) => ({
          routineId: r.routine_id,
          weekday: r.weekday,
          notificationId: r.notification_id,
        }));
    }
    return db
      .getAllSync<{
        routine_id: string;
        weekday: number;
        notification_id: string;
      }>(`SELECT * FROM routine_notifications`)
      .map((r) => ({
        routineId: r.routine_id,
        weekday: r.weekday,
        notificationId: r.notification_id,
      }));
  }
  const all = await readAsyncNotifs();
  return routineId ? all.filter((n) => n.routineId === routineId) : all;
}

export async function listRoutinesPastEndDate(
  on: Date = new Date(),
): Promise<Routine[]> {
  const all = await listRoutines();
  return all.filter((r) => r.active && isPastEndDate(r.endDate, on));
}
