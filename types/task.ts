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
};

export type Profile = {
  id: string;
  displayName: string | null;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  timezone: string | null;
  defaultVisualStyle: VisualStyle;
  streakCount: number;
  freezesAvailable: number;
  lastActiveDate: string | null;
};

export type Interruption = {
  id: string;
  taskId: string;
  startedAt: number;
  endedAt: number | null;
  synced: boolean;
};

export type NewTaskInput = {
  name?: string | null;
  description?: string | null;
  category?: TaskCategory | null;
  predictedSeconds: number;
  visualStyle?: VisualStyle;
  userId?: string | null;
  startedAt?: number;
};
