import type {
  Interruption,
  Profile,
  Routine,
  Task,
  VisualStyle,
} from '@/types/task';

export type RemoteTask = {
  id: string;
  user_id: string;
  name: string | null;
  description: string | null;
  category: string | null;
  predicted_seconds: number;
  actual_seconds: number | null;
  visual_style: string;
  started_at: string;
  ended_at: string | null;
  mood_tag: string | null;
  created_at: string;
  updated_at: string;
  routine_id: string | null;
};

export type RemoteProfile = {
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
  subscription_tier: string | null;
  subscription_expires_at: string | null;
};

export type RemoteInterruption = {
  id: string;
  task_id: string;
  started_at: string;
  ended_at: string | null;
};

export type RemoteRoutine = {
  id: string;
  user_id: string;
  name: string | null;
  category: string | null;
  predicted_seconds: number;
  visual_style: string;
  recurrence_days: string;
  reminder_hour: number;
  reminder_minute: number;
  start_date: string;
  end_date: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export function msToIso(ms: number): string {
  return new Date(ms).toISOString();
}

export function isoToMs(iso: string): number {
  const n = new Date(iso).getTime();
  return Number.isFinite(n) ? n : 0;
}

export function taskToRemotePayload(task: Task, userId: string) {
  return {
    id: task.id,
    user_id: userId,
    name: task.name,
    description: task.description,
    category: task.category,
    predicted_seconds: task.predictedSeconds,
    actual_seconds: task.actualSeconds,
    visual_style: task.visualStyle,
    started_at: msToIso(task.startedAt),
    ended_at: task.endedAt != null ? msToIso(task.endedAt) : null,
    mood_tag: task.moodTag,
    created_at: msToIso(task.createdAt),
    updated_at: msToIso(task.updatedAt),
    routine_id: task.routineId,
  };
}

export function remoteTaskToLocal(row: RemoteTask): Task {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name ?? 'Untitled',
    description: row.description ?? null,
    category: row.category as Task['category'],
    predictedSeconds: row.predicted_seconds,
    actualSeconds: row.actual_seconds,
    visualStyle: row.visual_style as VisualStyle,
    startedAt: isoToMs(row.started_at),
    endedAt: row.ended_at ? isoToMs(row.ended_at) : null,
    moodTag: row.mood_tag as Task['moodTag'],
    createdAt: isoToMs(row.created_at),
    updatedAt: isoToMs(row.updated_at),
    synced: true,
    routineId: row.routine_id ?? null,
  };
}

export function remoteProfileToLocal(row: RemoteProfile): Profile {
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
    subscriptionTier: (row.subscription_tier as Profile['subscriptionTier']) ?? 'standard',
    subscriptionExpiresAt: row.subscription_expires_at ?? null,
  };
}

export function remoteInterruptionToLocal(row: RemoteInterruption): Interruption {
  return {
    id: row.id,
    taskId: row.task_id,
    startedAt: isoToMs(row.started_at),
    endedAt: row.ended_at ? isoToMs(row.ended_at) : null,
    synced: true,
  };
}

export function interruptionToRemotePayload(row: Interruption) {
  return {
    id: row.id,
    task_id: row.taskId,
    started_at: msToIso(row.startedAt),
    ended_at: row.endedAt != null ? msToIso(row.endedAt) : null,
  };
}

export function profileToRemotePayload(profile: Profile) {
  return {
    id: profile.id,
    display_name: profile.displayName,
    username: profile.username,
    first_name: profile.firstName,
    last_name: profile.lastName,
    timezone: profile.timezone,
    default_visual_style: profile.defaultVisualStyle,
    streak_count: profile.streakCount,
    freezes_available: profile.freezesAvailable,
    last_active_date: profile.lastActiveDate,
    deleted_at: profile.deletedAt,
    subscription_tier: profile.subscriptionTier,
    subscription_expires_at: profile.subscriptionExpiresAt,
  };
}

export function routineToRemotePayload(routine: Routine, userId: string) {
  return {
    id: routine.id,
    user_id: userId,
    name: routine.name,
    category: routine.category,
    predicted_seconds: routine.predictedSeconds,
    visual_style: routine.visualStyle,
    recurrence_days: routine.recurrenceDays,
    reminder_hour: routine.reminderHour,
    reminder_minute: routine.reminderMinute,
    start_date: routine.startDate,
    end_date: routine.endDate,
    active: routine.active,
    created_at: msToIso(routine.createdAt),
    updated_at: msToIso(routine.updatedAt),
    deleted_at: routine.deletedAt != null ? msToIso(routine.deletedAt) : null,
  };
}

export function remoteRoutineToLocal(row: RemoteRoutine): Routine {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name ?? 'Routine',
    category: row.category as Routine['category'],
    predictedSeconds: row.predicted_seconds,
    visualStyle: row.visual_style as VisualStyle,
    recurrenceDays: row.recurrence_days,
    reminderHour: row.reminder_hour,
    reminderMinute: row.reminder_minute,
    startDate: row.start_date,
    endDate: row.end_date,
    active: Boolean(row.active),
    createdAt: isoToMs(row.created_at),
    updatedAt: isoToMs(row.updated_at),
    synced: true,
    deletedAt: row.deleted_at ? isoToMs(row.deleted_at) : null,
  };
}
