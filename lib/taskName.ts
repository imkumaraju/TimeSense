/**
 * Default task title when the user leaves name blank.
 * Example: "Timer · Aug 1, 12:03 PM"
 */
export function defaultTaskName(atMs: number = Date.now()): string {
  const formatted = new Date(atMs).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  return `Timer · ${formatted}`;
}

/** Prefer user-entered name; otherwise timestamp title. */
export function resolveTaskName(
  name: string | null | undefined,
  atMs: number = Date.now(),
): string {
  const trimmed = name?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : defaultTaskName(atMs);
}
