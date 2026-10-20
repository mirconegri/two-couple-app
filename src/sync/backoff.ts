export const BASE_DELAY_MS = 1_000;
export const MAX_DELAY_MS = 5 * 60 * 1_000;
export const MAX_ATTEMPTS_BEFORE_FAILED = 3;

/**
 * Exponential backoff with a hard ceiling.
 *
 * attempt 0 -> 1s, 1 -> 2s, 2 -> 4s ... capped at 5 minutes.
 * Jitter is applied by the caller (or not at all) so this stays deterministic
 * and therefore testable.
 */
export function backoffDelayMs(attempts: number): number {
  const safeAttempts = Number.isFinite(attempts) ? Math.max(0, Math.floor(attempts)) : 0;
  const raw = BASE_DELAY_MS * 2 ** safeAttempts;
  return Math.min(raw, MAX_DELAY_MS);
}

export function nextAttemptAt(attempts: number, now: Date = new Date()): string {
  return new Date(now.getTime() + backoffDelayMs(attempts)).toISOString();
}
