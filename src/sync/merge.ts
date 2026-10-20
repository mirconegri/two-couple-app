/**
 * Deterministic conflict resolution.
 *
 * The server is authoritative. A local row is only overwritten by a remote row
 * whose `updated_at` is at least as new. Comparing timestamps instead of
 * arrival order makes the outcome independent of which device reconnects first.
 *
 * Note: `payload.old` from Realtime carries only the primary key under RLS, so
 * conflicts are never resolved from the event payload — the row is re-fetched
 * and compared here.
 */
export function shouldApplyRemote(
  localUpdatedAt: string | null,
  remoteUpdatedAt: string,
): boolean {
  if (!localUpdatedAt) return true;

  const local = Date.parse(localUpdatedAt);
  const remote = Date.parse(remoteUpdatedAt);

  if (Number.isNaN(local)) return true;
  if (Number.isNaN(remote)) return false;

  return remote >= local;
}

/**
 * Pick the newest of the candidate timestamps, falling back to the existing
 * cursor. Used to advance the incremental pull cursor without ever moving it
 * backwards.
 */
export function newestTimestamp(
  candidates: readonly string[],
  previous: string | null,
): string | null {
  let best: string | null = previous;

  for (const candidate of candidates) {
    const parsed = Date.parse(candidate);
    if (Number.isNaN(parsed)) continue;
    if (best === null) {
      best = candidate;
      continue;
    }
    const bestParsed = Date.parse(best);
    if (Number.isNaN(bestParsed) || parsed > bestParsed) best = candidate;
  }

  return best;
}

/** Ascending by client timestamp; ties broken by id so order is stable. */
export function compareMessages(
  a: { clientCreatedAt: string; id: string },
  b: { clientCreatedAt: string; id: string },
): number {
  const aTime = Date.parse(a.clientCreatedAt);
  const bTime = Date.parse(b.clientCreatedAt);
  if (aTime !== bTime) return aTime - bTime;
  return a.id.localeCompare(b.id);
}
