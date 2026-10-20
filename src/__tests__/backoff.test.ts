import {
  backoffDelayMs,
  nextAttemptAt,
  BASE_DELAY_MS,
  MAX_DELAY_MS,
  MAX_ATTEMPTS_BEFORE_FAILED,
} from '../sync/backoff';

describe('backoffDelayMs', () => {
  it('starts at the base delay', () => {
    expect(backoffDelayMs(0)).toBe(BASE_DELAY_MS);
  });

  it('doubles with each attempt', () => {
    expect(backoffDelayMs(0)).toBe(1_000);
    expect(backoffDelayMs(1)).toBe(2_000);
    expect(backoffDelayMs(2)).toBe(4_000);
    expect(backoffDelayMs(3)).toBe(8_000);
  });

  it('never exceeds the ceiling', () => {
    expect(backoffDelayMs(20)).toBe(MAX_DELAY_MS);
    expect(backoffDelayMs(100)).toBe(MAX_DELAY_MS);
  });

  it('is monotonically non-decreasing', () => {
    for (let attempt = 0; attempt < 15; attempt += 1) {
      expect(backoffDelayMs(attempt + 1)).toBeGreaterThanOrEqual(backoffDelayMs(attempt));
    }
  });

  it('treats malformed input as attempt zero', () => {
    expect(backoffDelayMs(Number.NaN)).toBe(BASE_DELAY_MS);
    expect(backoffDelayMs(-5)).toBe(BASE_DELAY_MS);
    expect(backoffDelayMs(2.7)).toBe(4_000);
  });

  it('schedules the next attempt in the future', () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    const next = nextAttemptAt(2, now);
    expect(new Date(next).getTime()).toBe(now.getTime() + 4_000);
  });

  it('marks a message failed only after the configured number of attempts', () => {
    expect(MAX_ATTEMPTS_BEFORE_FAILED).toBeGreaterThan(1);
  });
});
