/** Shared task / timer types for TimeSense (local SQLite + Supabase). */

export type VisualStyle =
  | 'pizza'
  | 'pie'
  | 'plant'
  | 'moon'
  | 'monk'
  | 'cat'
  | 'bar'
  | 'ring';

export type MoodTag = 'too_fast' | 'about_right' | 'dragged_on';

export type TaskCategory =
  | 'chores'
  | 'work'
  | 'study'
  | 'errands'
  | 'creative'
  | 'other';

export type Task = {
  id: string;
  userId: string | null;
  name: string;
  description: string | null;
  category: TaskCategory | null;
  predictedSeconds: number;
  actualSeconds: number | null;
  visualStyle: VisualStyle;
  startedAt: number;
  endedAt: number | null;
  moodTag: MoodTag | null;
  createdAt: number;
  /** Bumped on every edit; drives delta sync watermark. */
  updatedAt: number;
  synced: boolean;
  /** Optional link to a recurring routine template. */
  routineId: string | null;
};

export type SubscriptionTier = 'standard' | 'plus';

export type Profile = {
  id: string;
  email: string | null;
  displayName: string | null;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  timezone: string | null;
  defaultVisualStyle: VisualStyle;
  streakCount: number;
  freezesAvailable: number;
  lastActiveDate: string | null;
  /** Soft-delete marker; null means active. */
  deletedAt: string | null;
  subscriptionTier: SubscriptionTier;
  /** ISO date string; null means non-expiring (lifetime) or standard tier. */
  subscriptionExpiresAt: string | null;
};

export type Interruption = {
  id: string;
  taskId: string;
  startedAt: number;
  endedAt: number | null;
  synced: boolean;
};

/** Recurring task template (synced). Weekdays: 0=Sun .. 6=Sat. */
export type Routine = {
  id: string;
  userId: string | null;
  name: string;
  category: TaskCategory | null;
  predictedSeconds: number;
  visualStyle: VisualStyle;
  /** Comma-separated JS weekdays 0–6. */
  recurrenceDays: string;
  reminderHour: number;
  reminderMinute: number;
  /** Local YYYY-MM-DD */
  startDate: string;
  endDate: string | null;
  active: boolean;
  createdAt: number;
  updatedAt: number;
  synced: boolean;
  deletedAt: number | null;
};

export type RoutineNotification = {
  routineId: string;
  /** Stored as JS weekday 0–6. */
  weekday: number;
  notificationId: string;
};

export type NewTaskInput = {
  name?: string | null;
  description?: string | null;
  category?: TaskCategory | null;
  predictedSeconds: number;
  visualStyle?: VisualStyle;
  userId?: string | null;
  startedAt?: number;
  routineId?: string | null;
};

export type NewRoutineInput = {
  name: string;
  category?: TaskCategory | null;
  predictedSeconds: number;
  visualStyle?: VisualStyle;
  recurrenceDays: number[];
  reminderHour: number;
  reminderMinute: number;
  startDate?: string;
  endDate?: string | null;
  userId?: string | null;
};
