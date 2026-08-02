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
  /** Tick counter so UI can re-derive without storing elapsed. */
  tick: number;
  start: (durationSeconds: number, meta?: Partial<ActiveTimerMeta>) => void;
  pause: () => void;
  resume: () => void;
  addFiveMinutes: () => void;
  toggleDigital: () => void;
  /** Force a re-derive (call from interval / AppState). */
  pulse: () => void;
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
  tick: 0,

  start: (durationSeconds, meta) => {
    set({
      snapshot: createTimer(durationSeconds),
      meta: { ...defaultMeta, ...meta, openInterruptionId: null },
      tick: 0,
    });
  },

  pause: () => {
    const { snapshot, meta } = get();
    if (!snapshot || snapshot.pauseStartedAtMs != null) return;
    const now = Date.now();
    set({ snapshot: pauseTimer(snapshot, now), tick: get().tick + 1 });

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
    set({
      snapshot: resumeTimer(snapshot, now),
      meta: meta ? { ...meta, openInterruptionId: null } : meta,
      tick: get().tick + 1,
    });
    if (openId) {
      void endInterruption(openId, now);
    }
  },

  addFiveMinutes: () => {
    const { snapshot } = get();
    if (!snapshot) return;
    set({ snapshot: addDurationSeconds(snapshot, 300), tick: get().tick + 1 });
  },

  toggleDigital: () => {
    const { meta } = get();
    if (!meta) return;
    set({ meta: { ...meta, showDigital: !meta.showDigital } });
  },

  pulse: () => set({ tick: get().tick + 1 }),

  clear: () => {
    const openId = get().meta?.openInterruptionId;
    if (openId) {
      void endInterruption(openId, Date.now());
    }
    set({ snapshot: null, meta: null, tick: 0 });
  },

  getDerived: (nowMs = Date.now()) => {
    const { snapshot } = get();
    if (!snapshot) return null;
    return deriveTimer(snapshot, nowMs);
  },
}));
