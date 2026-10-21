import {
  formatInviteCode,
  getMembershipStatus,
  getSpaceStatus,
} from '../utils/invite';
import { pullMembers } from '../sync/engine';
import type { Member } from '../types';
import type { AppDatabase } from '../db';
import type { RemotePort } from '../sync/remote';

describe('formatInviteCode', () => {
  const validRaw =
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const expectedFormatted =
    '01234567 89abcdef 01234567 89abcdef 01234567 89abcdef 01234567 89abcdef';

  it('formats a 64-char code into 8 groups of 8', () => {
    const formatted = formatInviteCode(validRaw);
    expect(formatted).toBe(expectedFormatted);

    const groups = formatted.split(' ');
    expect(groups).toHaveLength(8);
    for (const group of groups) {
      expect(group).toHaveLength(8);
    }
  });

  it('is idempotent when applied to already formatted code', () => {
    const formattedOnce = formatInviteCode(validRaw);
    const formattedTwice = formatInviteCode(formattedOnce);
    expect(formattedTwice).toBe(expectedFormatted);
    expect(formattedTwice).toBe(formattedOnce);
  });

  it('rejects malformed input (wrong length, non-hex, empty)', () => {
    expect(() => formatInviteCode('')).toThrow(/Invalid invitation code/);
    expect(() => formatInviteCode('too-short')).toThrow(/Invalid invitation code/);
    // 63 chars (one short)
    expect(() => formatInviteCode(validRaw.slice(0, 63))).toThrow(
      /Invalid invitation code/,
    );
    // 65 chars (one too long)
    expect(() => formatInviteCode(`${validRaw}a`)).toThrow(
      /Invalid invitation code/,
    );
    // 64 chars but non-hex 'z'
    const nonHex = validRaw.slice(0, 63) + 'z';
    expect(() => formatInviteCode(nonHex)).toThrow(/Invalid invitation code/);
    // Non-string input
    // @ts-expect-error testing invalid type
    expect(() => formatInviteCode(null)).toThrow(/Invalid invitation code/);
  });
});

describe('getSpaceStatus', () => {
  const memberA: Member = {
    userId: 'user-1',
    coupleId: 'couple-1',
    joinedAt: '2026-01-01T00:00:00.000Z',
    email: 'user1@example.com',
    displayName: 'User 1',
  };

  const memberB: Member = {
    userId: 'user-2',
    coupleId: 'couple-1',
    joinedAt: '2026-01-01T00:01:00.000Z',
    email: 'user2@example.com',
    displayName: 'User 2',
  };

  it('yields "waiting" for an array of length 1 (and length 0)', () => {
    expect(getSpaceStatus([memberA])).toBe('waiting');
    expect(getSpaceStatus([])).toBe('waiting');
    expect(getMembershipStatus([memberA])).toBe('waiting');
  });

  it('yields "complete" for an array of length 2', () => {
    expect(getSpaceStatus([memberA, memberB])).toBe('complete');
    expect(getMembershipStatus([memberA, memberB])).toBe('complete');
  });
});

describe('pullMembers', () => {
  it('rewrites the local members table on success', async () => {
    const executedQueries: Array<{ sql: string; params: unknown[] }> = [];
    const mockDb = {
      withExclusiveTransactionAsync: async (cb: (txn: unknown) => Promise<void>) => {
        await cb(mockDb);
      },
      runAsync: async (sql: string, ...params: unknown[]) => {
        executedQueries.push({ sql, params });
      },
    } as unknown as AppDatabase;

    const mockRemote = {
      fetchMembers: jest.fn().mockResolvedValue([
        {
          userId: 'u1',
          email: null,
          displayName: null,
          coupleId: 'c1',
          joinedAt: '2026-01-01',
        },
      ]),
    } as unknown as RemotePort;

    const res = await pullMembers(mockDb, mockRemote, 'c1');
    expect(res.members).toBe(1);
    expect(res.error).toBeNull();
    expect(executedQueries.length).toBe(2);
    expect(executedQueries[0]?.sql).toContain('delete from members');
    expect(executedQueries[1]?.sql).toContain('insert into members');
  });

  it('handles remote errors gracefully', async () => {
    const mockDb = {} as unknown as AppDatabase;
    const mockRemote = {
      fetchMembers: jest.fn().mockRejectedValue(new Error('Network error')),
    } as unknown as RemotePort;

    const res = await pullMembers(mockDb, mockRemote, 'c1');
    expect(res.members).toBe(0);
    expect(res.error).toBe('Network error');
  });
});
