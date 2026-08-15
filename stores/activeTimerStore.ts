import { create } from 'zustand';

import {
  addDurationSeconds,
  createTimer,
  deriveTimer,
  pauseTimer,
  resumeTimer,
  type TimerDerived,
  type TimerSnapshot,
} from '@/lib/timerMath';
import {
  cancelTimerNotifications,
  EMPTY_MILESTONE_FLAGS,
  type MilestoneFireFlags,
  syncTimerNotifications,
} from '@/lib/timerFeedback';
import { endInterruption, startInterruption } from '@/lib/tasksDb';
import type { TaskCategory, VisualStyle } from '@/types/task';

export type ActiveTimerMeta = {
  taskId: string | null;
  name: string | null;
  description: string | null;
  category: TaskCategory | null;
  visualStyle: VisualStyle;
  showDigital: boolean;
  /** Open pause gap row id (local interruptions table). */
  openInterruptionId: string | null;
};

type ActiveTimerState = {
  snapshot: TimerSnapshot | null;
  meta: ActiveTimerMeta | null;
  milestoneFlags: MilestoneFireFlags;
  /** Tick counter so UI can re-derive without storing elapsed. */
  tick: number;
  start: (durationSeconds: number, meta?: Partial<ActiveTimerMeta>) => void;
  pause: () => void;
  resume: () => void;
  addFiveMinutes: () => void;
  toggleDigital: () => void;
  /** Force a re-derive (call from interval / AppState). */
  pulse: () => void;
  setMilestoneFlags: (flags: MilestoneFireFlags) => void;
  clear: () => void;
  getDerived: (nowMs?: number) => TimerDerived | null;
};

const defaultMeta: ActiveTimerMeta = {
  taskId: null,
  name: null,
  description: null,
  category: null,
  visualStyle: 'pizza',
  showDigital: true,
  openInterruptionId: null,
};

export const useActiveTimerStore = create<ActiveTimerState>((set, get) => ({
  snapshot: null,
  meta: null,
  milestoneFlags: EMPTY_MILESTONE_FLAGS,
  tick: 0,

  start: (durationSeconds, meta) => {
    const snapshot = createTimer(durationSeconds);
    set({
      snapshot,
      meta: { ...defaultMeta, ...meta, openInterruptionId: null },
      milestoneFlags: EMPTY_MILESTONE_FLAGS,
      tick: 0,
    });
    void syncTimerNotifications(snapshot);
  },

  pause: () => {
    const { snapshot, meta } = get();
    if (!snapshot || snapshot.pauseStartedAtMs != null) return;
    const now = Date.now();
    set({ snapshot: pauseTimer(snapshot, now), tick: get().tick + 1 });
    void cancelTimerNotifications();

    if (meta?.taskId) {
      void startInterruption(meta.taskId, now).then((row) => {
        const current = get().meta;
        if (!current || current.taskId !== meta.taskId) return;
        set({
          meta: { ...current, openInterruptionId: row.id },
          tick: get().tick + 1,
        });
      });
    }
  },

  resume: () => {
    const { snapshot, meta } = get();
    if (!snapshot || snapshot.pauseStartedAtMs == null) return;
    const now = Date.now();
    const openId = meta?.openInterruptionId ?? null;
    const next = resumeTimer(snapshot, now);
    set({
      snapshot: next,
      meta: meta ? { ...meta, openInterruptionId: null } : meta,
      tick: get().tick + 1,
    });
    void syncTimerNotifications(next);
    if (openId) {
      void endInterruption(openId, now);
    }
  },

  addFiveMinutes: () => {
    const { snapshot } = get();
    if (!snapshot) return;
    const next = addDurationSeconds(snapshot, 300);
    set({ snapshot: next, tick: get().tick + 1 });
    void syncTimerNotifications(next);
  },

  toggleDigital: () => {
    const { meta } = get();
    if (!meta) return;
    set({ meta: { ...meta, showDigital: !meta.showDigital } });
  },

  pulse: () => set({ tick: get().tick + 1 }),

  setMilestoneFlags: (flags) => set({ milestoneFlags: flags }),

  clear: () => {
    const openId = get().meta?.openInterruptionId;
    if (openId) {
      void endInterruption(openId, Date.now());
    }
    void cancelTimerNotifications();
    set({
      snapshot: null,
      meta: null,
      milestoneFlags: EMPTY_MILESTONE_FLAGS,
      tick: 0,
    });
  },

  getDerived: (nowMs = Date.now()) => {
    const { snapshot } = get();
    if (!snapshot) return null;
    return deriveTimer(snapshot, nowMs);
  },
}));
