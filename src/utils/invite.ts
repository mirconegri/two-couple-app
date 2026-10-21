import type { Member } from '../types';

/**
 * Formats a 64-character hexadecimal invitation code into 8 groups of 8 characters,
 * separated by spaces.
 *
 * Example:
 * '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
 * becomes:
 * '01234567 89abcdef 01234567 89abcdef 01234567 89abcdef 01234567 89abcdef'
 *
 * Rejects malformed input (wrong length, non-hex characters).
 * Idempotent: formatting an already formatted code returns the same formatted code.
 */
export function formatInviteCode(code: string): string {
  if (typeof code !== 'string') {
    throw new Error('Invalid invitation code: expected string');
  }

  const clean = code.replace(/\s+/g, '').toLowerCase();

  if (!/^[0-9a-f]{64}$/.test(clean)) {
    throw new Error('Invalid invitation code: must be a 64-character hexadecimal string');
  }

  const groups = clean.match(/.{1,8}/g);
  if (!groups || groups.length !== 8) {
    throw new Error('Failed to format invitation code');
  }

  return groups.join(' ');
}

export type SpaceStatus = 'waiting' | 'complete';

/**
 * Determines space status based on members count:
 * - fewer than 2 members: 'waiting'
 * - 2 or more members: 'complete'
 */
export function getSpaceStatus(members: readonly Member[] | readonly unknown[]): SpaceStatus {
  return members.length >= 2 ? 'complete' : 'waiting';
}

export const getMembershipStatus = getSpaceStatus;
