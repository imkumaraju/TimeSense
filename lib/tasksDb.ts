import * as Crypto from 'expo-crypto';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { resolveTaskName } from '@/lib/taskName';
import type {
  Interruption,
  NewTaskInput,
  Profile,
  Task,
  VisualStyle,
} from '@/types/task';

const WEB_KEY = 'timesense.tasks.v1';
const WEB_INTERRUPTIONS_KEY = 'timesense.interruptions.v1';
const WEB_PROFILE_KEY = 'timesense.profile.v1';

type TaskRow = {
  id: string;
  user_id: string | null;
  name: string;
  description: string | null;
  category: string | null;
  predicted_seconds: number;
  actual_seconds: number | null;
  visual_style: string;
  started_at: number;
  ended_at: number | null;
  mood_tag: string | null;
  created_at: number;
  updated_at: number;
  synced: number;
  routine_id: string | null;
};

type InterruptionRow = {
  id: string;
  task_id: string;
  started_at: number;
  ended_at: number | null;
  synced: number;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  timezone: string | null;
  default_visual_style: string | null;
  streak_count: number | null;
  freezes_available: number | null;
  last_active_date: string | null;
  deleted_at: string | null;
};

function rowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description,
    category: row.category as Task['category'],
    predictedSeconds: row.predicted_seconds,
    actualSeconds: row.actual_seconds,
    visualStyle: row.visual_style as VisualStyle,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    moodTag: row.mood_tag as Task['moodTag'],
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
    synced: row.synced === 1,
    routineId: row.routine_id ?? null,
  };
}

function rowToInterruption(row: InterruptionRow): Interruption {
  return {
    id: row.id,
    taskId: row.task_id,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    synced: row.synced === 1,
  };
}

function rowToProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    displayName: row.display_name,
    username: row.username ?? null,
    firstName: row.first_name ?? null,
    lastName: row.last_name ?? null,
    timezone: row.timezone,
    defaultVisualStyle: (row.default_visual_style as VisualStyle) ?? 'pizza',
    streakCount: row.streak_count ?? 0,
    freezesAvailable: row.freezes_available ?? 2,
    lastActiveDate: row.last_active_date,
    deletedAt: row.deleted_at ?? null,
  };
}

/** Normalize legacy AsyncStorage tasks missing updatedAt. */
function normalizeTask(task: Task): Task {
  return {
    ...task,
    updatedAt: task.updatedAt ?? task.createdAt ?? task.startedAt,
    synced: Boolean(task.synced),
    routineId: task.routineId ?? null,
  };
}

let sqliteDb: import('expo-sqlite').SQLiteDatabase | null = null;
let initPromise: Promise<void> | null = null;

/** Expo Go + web: prefer AsyncStorage to avoid native SQLite startup crashes. */
let useAsyncStore =
  Platform.OS === 'web' || Constants.appOwnership === 'expo';

function migrateSqliteSchema(db: import('expo-sqlite').SQLiteDatabase) {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT,
      predicted_seconds INTEGER NOT NULL,
      actual_seconds INTEGER,
      visual_style TEXT NOT NULL DEFAULT 'pizza',
      started_at INTEGER NOT NULL,
      ended_at INTEGER,
      mood_tag TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      synced INTEGER NOT NULL DEFAULT 0,
      routine_id TEXT
    );

    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      display_name TEXT,
      username TEXT,
      first_name TEXT,
      last_name TEXT,
      timezone TEXT,
      default_visual_style TEXT DEFAULT 'pizza',
      streak_count INTEGER DEFAULT 0,
      freezes_available INTEGER DEFAULT 2,
      last_active_date TEXT,
      deleted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS interruptions (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      started_at INTEGER NOT NULL,
      ended_at INTEGER,
      synced INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS routines (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT,
      name TEXT NOT NULL,
      category TEXT,
      predicted_seconds INTEGER NOT NULL,
      visual_style TEXT NOT NULL DEFAULT 'pizza',
      recurrence_days TEXT NOT NULL,
      reminder_hour INTEGER NOT NULL DEFAULT 9,
      reminder_minute INTEGER NOT NULL DEFAULT 0,
      start_date TEXT NOT NULL,
      end_date TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      synced INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS routine_notifications (
      routine_id TEXT NOT NULL,
      weekday INTEGER NOT NULL,
      notification_id TEXT NOT NULL,
      PRIMARY KEY (routine_id, weekday)
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_user_updated ON tasks(user_id, updated_at);
    CREATE INDEX IF NOT EXISTS idx_tasks_user_category ON tasks(user_id, category);
    CREATE INDEX IF NOT EXISTS idx_routines_user_updated ON routines(user_id, updated_at);
  `);

  const alterSafe = (sql: string) => {
    try {
      db.execSync(sql);
    } catch {
      // column already exists
    }
  };

  alterSafe(`ALTER TABLE tasks ADD COLUMN description TEXT`);
  alterSafe(`ALTER TABLE tasks ADD COLUMN updated_at INTEGER`);
  alterSafe(`ALTER TABLE tasks ADD COLUMN routine_id TEXT`);
  alterSafe(`ALTER TABLE profiles ADD COLUMN username TEXT`);
  alterSafe(`ALTER TABLE profiles ADD COLUMN first_name TEXT`);
  alterSafe(`ALTER TABLE profiles ADD COLUMN last_name TEXT`);
  alterSafe(`ALTER TABLE profiles ADD COLUMN deleted_at TEXT`);

  // Backfill updated_at for rows created before the cost-strategy schema.
  db.execSync(
    `UPDATE tasks SET updated_at = created_at WHERE updated_at IS NULL OR updated_at = 0`,
  );
}

async function getSqlite() {
  if (useAsyncStore) return null;
  if (sqliteDb) return sqliteDb;
  try {
    const SQLite = await import('expo-sqlite');
    sqliteDb = SQLite.openDatabaseSync('timesense.db');
    migrateSqliteSchema(sqliteDb);
    return sqliteDb;
  } catch {
    useAsyncStore = true;
    return null;
  }
}

async function readAsyncTasks(): Promise<Task[]> {
  const raw = await AsyncStorage.getItem(WEB_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Task[];
    return parsed.map(normalizeTask);
  } catch {
    return [];
  }
}

async function writeAsyncTasks(tasks: Task[]): Promise<void> {
  await AsyncStorage.setItem(WEB_KEY, JSON.stringify(tasks));
}

async function readAsyncInterruptions(): Promise<Interruption[]> {
  const raw = await AsyncStorage.getItem(WEB_INTERRUPTIONS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Interruption[];
  } catch {
    return [];
  }
}

async function writeAsyncInterruptions(rows: Interruption[]): Promise<void> {
  await AsyncStorage.setItem(WEB_INTERRUPTIONS_KEY, JSON.stringify(rows));
}

async function nudgeSync() {
  try {
    const { syncNow } = await import('@/lib/syncService');
    void syncNow();
  } catch {
    // sync is best-effort; local write already succeeded
  }
}

export async function initTasksDb(): Promise<void> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    await getSqlite();
  })();
  return initPromise;
}

/**
 * Shared native connection for other local-data modules (e.g. routinesDb).
 * Never open a second `openDatabaseSync('timesense.db')` connection —
 * concurrent connections to the same file are a real source of Android
 * `NativeDatabase.prepareSync` crashes. Returns null on web / Expo Go,
 * where callers should fall back to AsyncStorage.
 */
export async function getSharedSqliteDb() {
  await initTasksDb();
  return getSqlite();
}

export async function createTask(input: NewTaskInput): Promise<Task> {
  await initTasksDb();
  const now = input.startedAt ?? Date.now();
  const task: Task = {
    id: Crypto.randomUUID(),
    userId: input.userId ?? null,
    name: resolveTaskName(input.name, now),
    description: input.description?.trim() ? input.description.trim() : null,
    category: input.category ?? null,
    predictedSeconds: input.predictedSeconds,
    actualSeconds: null,
    visualStyle: input.visualStyle ?? 'pizza',
    startedAt: now,
    endedAt: null,
    moodTag: null,
    createdAt: now,
    updatedAt: now,
    synced: false,
    routineId: input.routineId ?? null,
  };

  const db = await getSqlite();
  if (db) {
    db.runSync(
      `INSERT INTO tasks (
        id, user_id, name, description, category, predicted_seconds, actual_seconds,
        visual_style, started_at, ended_at, mood_tag, created_at, updated_at, synced, routine_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        task.id,
        task.userId,
        task.name,
        task.description,
        task.category,
        task.predictedSeconds,
        task.actualSeconds,
        task.visualStyle,
        task.startedAt,
        task.endedAt,
        task.moodTag,
        task.createdAt,
        task.updatedAt,
        0,
        task.routineId,
      ],
    );
  } else {
    const tasks = await readAsyncTasks();
    tasks.unshift(task);
    await writeAsyncTasks(tasks);
  }

  void nudgeSync();
  return task;
}

export async function completeTask(
  id: string,
  actualSeconds: number,
  endedAt: number = Date.now(),
  moodTag: Task['moodTag'] = null,
): Promise<void> {
  await initTasksDb();
  const db = await getSqlite();
  if (db) {
    db.runSync(
      `UPDATE tasks
       SET actual_seconds = ?, ended_at = ?, mood_tag = COALESCE(?, mood_tag),
           updated_at = ?, synced = 0
       WHERE id = ?`,
      [actualSeconds, endedAt, moodTag, endedAt, id],
    );
    void nudgeSync();
    return;
  }

  const tasks = await readAsyncTasks();
  const next = tasks.map((t) =>
    t.id === id
      ? {
          ...t,
          actualSeconds,
          endedAt,
          moodTag: moodTag ?? t.moodTag,
          updatedAt: endedAt,
          synced: false,
        }
      : t,
  );
  await writeAsyncTasks(next);
  void nudgeSync();
}

export async function listRecentTasks(limit = 50): Promise<Task[]> {
  await initTasksDb();
  const db = await getSqlite();
  if (db) {
    const rows = db.getAllSync<TaskRow>(
      `SELECT * FROM tasks ORDER BY started_at DESC LIMIT ?`,
      [limit],
    );
    return rows.map(rowToTask);
  }

  const tasks = await readAsyncTasks();
  return tasks
    .slice()
    .sort((a, b) => b.startedAt - a.startedAt)
    .slice(0, limit);
}

export async function getTaskById(id: string): Promise<Task | null> {
  await initTasksDb();
  const db = await getSqlite();
  if (db) {
    const row = db.getFirstSync<TaskRow>(`SELECT * FROM tasks WHERE id = ?`, [id]);
    return row ? rowToTask(row) : null;
  }
  const tasks = await readAsyncTasks();
  return tasks.find((t) => t.id === id) ?? null;
}

export async function listUnsyncedTasks(): Promise<Task[]> {
  await initTasksDb();
  const db = await getSqlite();
  if (db) {
    const rows = db.getAllSync<TaskRow>(
      `SELECT * FROM tasks WHERE synced = 0 ORDER BY updated_at ASC`,
    );
    return rows.map(rowToTask);
  }
  return (await readAsyncTasks()).filter((t) => !t.synced);
}

export async function markTasksSynced(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await initTasksDb();
  const db = await getSqlite();
  if (db) {
    for (const id of ids) {
      db.runSync(`UPDATE tasks SET synced = 1 WHERE id = ?`, [id]);
    }
    return;
  }
  const tasks = await readAsyncTasks();
  const idSet = new Set(ids);
  await writeAsyncTasks(
    tasks.map((t) => (idSet.has(t.id) ? { ...t, synced: true } : t)),
  );
}

/** Attach guest rows to the signed-in user and queue them for push. */
export async function claimGuestTasks(userId: string): Promise<number> {
  await initTasksDb();
  const now = Date.now();
  const db = await getSqlite();
  if (db) {
    const pending = db.getAllSync<{ id: string }>(
      `SELECT id FROM tasks WHERE user_id IS NULL OR user_id = ''`,
    );
    if (pending.length === 0) return 0;
    db.runSync(
      `UPDATE tasks
       SET user_id = ?, updated_at = ?, synced = 0
       WHERE user_id IS NULL OR user_id = ''`,
      [userId, now],
    );
    return pending.length;
  }

  const tasks = await readAsyncTasks();
  let count = 0;
  const next = tasks.map((t) => {
    if (t.userId) return t;
    count += 1;
    return { ...t, userId, updatedAt: now, synced: false };
  });
  await writeAsyncTasks(next);
  return count;
}

export async function upsertLocalTask(task: Task): Promise<void> {
  await initTasksDb();
  const normalized = normalizeTask(task);
  const db = await getSqlite();
  if (db) {
    db.runSync(
      `INSERT INTO tasks (
        id, user_id, name, description, category, predicted_seconds, actual_seconds,
        visual_style, started_at, ended_at, mood_tag, created_at, updated_at, synced, routine_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        user_id = excluded.user_id,
        name = excluded.name,
        description = excluded.description,
        category = excluded.category,
        predicted_seconds = excluded.predicted_seconds,
        actual_seconds = excluded.actual_seconds,
        visual_style = excluded.visual_style,
        started_at = excluded.started_at,
        ended_at = excluded.ended_at,
        mood_tag = excluded.mood_tag,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at,
        synced = excluded.synced,
        routine_id = excluded.routine_id`,
      [
        normalized.id,
        normalized.userId,
        normalized.name,
        normalized.description,
        normalized.category,
        normalized.predictedSeconds,
        normalized.actualSeconds,
        normalized.visualStyle,
        normalized.startedAt,
        normalized.endedAt,
        normalized.moodTag,
        normalized.createdAt,
        normalized.updatedAt,
        normalized.synced ? 1 : 0,
        normalized.routineId,
      ],
    );
    return;
  }

  const tasks = await readAsyncTasks();
  const idx = tasks.findIndex((t) => t.id === normalized.id);
  if (idx >= 0) tasks[idx] = normalized;
  else tasks.unshift(normalized);
  await writeAsyncTasks(tasks);
}

export async function upsertLocalProfile(profile: Profile): Promise<void> {
  await initTasksDb();
  const db = await getSqlite();
  if (db) {
    db.runSync(
      `INSERT INTO profiles (
        id, display_name, username, first_name, last_name, timezone, default_visual_style,
        streak_count, freezes_available, last_active_date, deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        display_name = excluded.display_name,
        username = excluded.username,
        first_name = excluded.first_name,
        last_name = excluded.last_name,
        timezone = excluded.timezone,
        default_visual_style = excluded.default_visual_style,
        streak_count = excluded.streak_count,
        freezes_available = excluded.freezes_available,
        last_active_date = excluded.last_active_date,
        deleted_at = excluded.deleted_at`,
      [
        profile.id,
        profile.displayName,
        profile.username,
        profile.firstName,
        profile.lastName,
        profile.timezone,
        profile.defaultVisualStyle,
        profile.streakCount,
        profile.freezesAvailable,
        profile.lastActiveDate,
        profile.deletedAt,
      ],
    );
    return;
  }
  await AsyncStorage.setItem(WEB_PROFILE_KEY, JSON.stringify(profile));
}

export async function getLocalProfile(id: string): Promise<Profile | null> {
  await initTasksDb();
  const db = await getSqlite();
  if (db) {
    const row = db.getFirstSync<ProfileRow>(`SELECT * FROM profiles WHERE id = ?`, [
      id,
    ]);
    return row ? rowToProfile(row) : null;
  }
  const raw = await AsyncStorage.getItem(WEB_PROFILE_KEY);
  if (!raw) return null;
  try {
    const profile = JSON.parse(raw) as Profile;
    if (profile.id !== id) return null;
    return {
      ...profile,
      username: profile.username ?? null,
      firstName: profile.firstName ?? null,
      lastName: profile.lastName ?? null,
      deletedAt: profile.deletedAt ?? null,
    };
  } catch {
    return null;
  }
}

export async function listUnsyncedInterruptions(): Promise<Interruption[]> {
  await initTasksDb();
  const db = await getSqlite();
  if (db) {
    const rows = db.getAllSync<InterruptionRow>(
      `SELECT * FROM interruptions WHERE synced = 0 ORDER BY started_at ASC`,
    );
    return rows.map(rowToInterruption);
  }
  return (await readAsyncInterruptions()).filter((r) => !r.synced);
}

export async function markInterruptionsSynced(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await initTasksDb();
  const db = await getSqlite();
  if (db) {
    for (const id of ids) {
      db.runSync(`UPDATE interruptions SET synced = 1 WHERE id = ?`, [id]);
    }
    return;
  }
  const rows = await readAsyncInterruptions();
  const idSet = new Set(ids);
  await writeAsyncInterruptions(
    rows.map((r) => (idSet.has(r.id) ? { ...r, synced: true } : r)),
  );
}

export async function upsertLocalInterruption(row: Interruption): Promise<void> {
  await initTasksDb();
  const db = await getSqlite();
  if (db) {
    db.runSync(
      `INSERT INTO interruptions (id, task_id, started_at, ended_at, synced)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         task_id = excluded.task_id,
         started_at = excluded.started_at,
         ended_at = excluded.ended_at,
         synced = excluded.synced`,
      [row.id, row.taskId, row.startedAt, row.endedAt, row.synced ? 1 : 0],
    );
    return;
  }
  const rows = await readAsyncInterruptions();
  const idx = rows.findIndex((r) => r.id === row.id);
  if (idx >= 0) rows[idx] = row;
  else rows.push(row);
  await writeAsyncInterruptions(rows);
}

/** Start a pause gap for a task (synced=0 until push). */
export async function startInterruption(taskId: string, atMs = Date.now()): Promise<Interruption> {
  const row: Interruption = {
    id: Crypto.randomUUID(),
    taskId,
    startedAt: atMs,
    endedAt: null,
    synced: false,
  };
  await upsertLocalInterruption(row);
  return row;
}

/** Close an open interruption and mark unsynced for push. */
export async function endInterruption(
  interruptionId: string,
  atMs = Date.now(),
): Promise<void> {
  await initTasksDb();
  const db = await getSqlite();
  if (db) {
    db.runSync(
      `UPDATE interruptions SET ended_at = ?, synced = 0 WHERE id = ?`,
      [atMs, interruptionId],
    );
    return;
  }
  const rows = await readAsyncInterruptions();
  await writeAsyncInterruptions(
    rows.map((r) =>
      r.id === interruptionId ? { ...r, endedAt: atMs, synced: false } : r,
    ),
  );
}

/** Wipe all local task / interruption / profile rows (does not touch auth session). */
export async function wipeLocalData(): Promise<void> {
  await initTasksDb();
  const db = await getSqlite();
  if (db) {
    db.execSync(`
      DELETE FROM interruptions;
      DELETE FROM tasks;
      DELETE FROM profiles;
      DELETE FROM routine_notifications;
      DELETE FROM routines;
    `);
  }
  await AsyncStorage.multiRemove([
    WEB_KEY,
    WEB_INTERRUPTIONS_KEY,
    WEB_PROFILE_KEY,
  ]);
  try {
    const { wipeLocalRoutines } = await import('@/lib/routinesDb');
    await wipeLocalRoutines();
  } catch {
    // ignore
  }
  try {
    const { clearSyncState } = await import('@/lib/syncService');
    await clearSyncState();
  } catch {
    // sync module optional during early init
  }
}

/**
 * Remove local rows owned by a signed-in user; keep guest (user_id IS NULL) tasks.
 */
export async function wipeLocalUserData(userId: string): Promise<void> {
  await initTasksDb();
  const db = await getSqlite();
  if (db) {
    db.runSync(
      `DELETE FROM interruptions WHERE task_id IN (
         SELECT id FROM tasks WHERE user_id = ?
       )`,
      [userId],
    );
    db.runSync(`DELETE FROM tasks WHERE user_id = ?`, [userId]);
    db.runSync(`DELETE FROM profiles WHERE id = ?`, [userId]);
    return;
  }

  const tasks = await readAsyncTasks();
  const keep = tasks.filter((t) => t.userId !== userId);
  const removedIds = new Set(
    tasks.filter((t) => t.userId === userId).map((t) => t.id),
  );
  await writeAsyncTasks(keep);

  const interruptions = await readAsyncInterruptions();
  await writeAsyncInterruptions(
    interruptions.filter((r) => !removedIds.has(r.taskId)),
  );

  const raw = await AsyncStorage.getItem(WEB_PROFILE_KEY);
  if (raw) {
    try {
      const profile = JSON.parse(raw) as Profile;
      if (profile.id === userId) {
        await AsyncStorage.removeItem(WEB_PROFILE_KEY);
      }
    } catch {
      // ignore
    }
  }
}
