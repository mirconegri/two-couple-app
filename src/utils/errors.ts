/**
 * Normalises anything thrown into a short, user-safe string.
 * Deliberately avoids echoing SQL, JWTs, or stack traces into the UI.
 */
export function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    const text = error.message ?? '';
    return sanitise(text) || 'Something went wrong';
  }
  if (typeof error === 'string') {
    return sanitise(error) || 'Something went wrong';
  }
  if (error && typeof error === 'object' && 'message' in error) {
    const value = (error as { message?: unknown }).message;
    if (typeof value === 'string') return sanitise(value) || 'Something went wrong';
  }
  return 'Something went wrong';
}

function sanitise(text: string): string {
  let out = text.trim();

  // Postgres error prefix, e.g. "PostgrestError: " or "Error: "
  out = out.replace(/^[A-Za-z]*Error:\s*/u, '');

  // Never surface internal identifiers or tokens.
  out = out.replace(/eyJ[A-Za-z0-9._-]+/gu, '[token]');
  out = out.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/giu, '[id]');

  return out.slice(0, 200);
}
