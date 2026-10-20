import { compareMessages, newestTimestamp, shouldApplyRemote } from '../sync/merge';

describe('shouldApplyRemote', () => {
  it('applies when there is no local row', () => {
    expect(shouldApplyRemote(null, '2026-01-01T00:00:00.000Z')).toBe(true);
  });

  it('applies when the remote row is newer', () => {
    expect(
      shouldApplyRemote('2026-01-01T00:00:00.000Z', '2026-01-01T00:00:01.000Z'),
    ).toBe(true);
  });

  it('applies when timestamps are identical (idempotent replay)', () => {
    const stamp = '2026-01-01T00:00:00.000Z';
    expect(shouldApplyRemote(stamp, stamp)).toBe(true);
  });

  it('rejects an older remote row', () => {
    expect(
      shouldApplyRemote('2026-01-01T00:00:02.000Z', '2026-01-01T00:00:01.000Z'),
    ).toBe(false);
  });

  it('applies when the local timestamp is unparseable', () => {
    expect(shouldApplyRemote('not-a-date', '2026-01-01T00:00:00.000Z')).toBe(true);
  });

  it('rejects when the remote timestamp is unparseable', () => {
    expect(shouldApplyRemote('2026-01-01T00:00:00.000Z', 'garbage')).toBe(false);
  });
});

describe('newestTimestamp', () => {
  it('returns the previous cursor when there are no candidates', () => {
    expect(newestTimestamp([], '2026-01-01T00:00:00.000Z')).toBe(
      '2026-01-01T00:00:00.000Z',
    );
  });

  it('returns the newest candidate', () => {
    expect(
      newestTimestamp(
        ['2026-01-01T00:00:00.000Z', '2026-01-03T00:00:00.000Z', '2026-01-02T00:00:00.000Z'],
        null,
      ),
    ).toBe('2026-01-03T00:00:00.000Z');
  });

  it('never moves the cursor backwards', () => {
    expect(
      newestTimestamp(['2026-01-01T00:00:00.000Z'], '2026-02-01T00:00:00.000Z'),
    ).toBe('2026-02-01T00:00:00.000Z');
  });

  it('ignores unparseable candidates', () => {
    expect(newestTimestamp(['garbage', '2026-01-05T00:00:00.000Z'], null)).toBe(
      '2026-01-05T00:00:00.000Z',
    );
  });
});

describe('compareMessages', () => {
  it('orders by client timestamp ascending', () => {
    const a = { clientCreatedAt: '2026-01-01T00:00:00.000Z', id: 'a' };
    const b = { clientCreatedAt: '2026-01-01T00:00:01.000Z', id: 'b' };
    expect(compareMessages(a, b)).toBeLessThan(0);
    expect(compareMessages(b, a)).toBeGreaterThan(0);
  });

  it('breaks ties by id so ordering is stable', () => {
    const a = { clientCreatedAt: '2026-01-01T00:00:00.000Z', id: 'aaa' };
    const b = { clientCreatedAt: '2026-01-01T00:00:00.000Z', id: 'bbb' };
    expect(compareMessages(a, b)).toBeLessThan(0);
    expect(compareMessages(b, a)).toBeGreaterThan(0);
  });
});
