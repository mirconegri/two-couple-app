import { errorMessage } from '../utils/errors';

describe('errorMessage', () => {
  it('returns the message of an Error', () => {
    expect(errorMessage(new Error('Something broke'))).toBe('Something broke');
  });

  it('strips the PostgrestError prefix', () => {
    expect(errorMessage(new Error('PostgrestError: duplicate key'))).toBe('duplicate key');
  });

  it('redacts JWT-shaped tokens', () => {
    const message = errorMessage(
      new Error('failed with eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abc123'),
    );
    expect(message).not.toContain('eyJhbGciOiJIUzI1NiJ9');
    expect(message).toContain('[token]');
  });

  it('redacts UUIDs', () => {
    const message = errorMessage(
      new Error('row 11111111-2222-3333-4444-555555555555 not found'),
    );
    expect(message).not.toContain('11111111-2222');
    expect(message).toContain('[id]');
  });

  it('handles non-Error values', () => {
    expect(errorMessage('plain string')).toBe('plain string');
    expect(errorMessage(null)).toBe('Something went wrong');
    expect(errorMessage({ message: 'from object' })).toBe('from object');
  });

  it('truncates very long messages', () => {
    const long = errorMessage(new Error('x'.repeat(500)));
    expect(long.length).toBeLessThanOrEqual(200);
  });

  it('falls back when the message is only a prefix', () => {
    expect(errorMessage(new Error('Error: '))).toBe('Error:');
  });
});
