import * as Crypto from 'expo-crypto';

/**
 * Client-generated primary key. Generating the id locally is what makes an
 * offline retry idempotent: the same id is sent again and the server upsert
 * resolves to the same row instead of creating a duplicate.
 */
export function newId(): string {
  return Crypto.randomUUID();
}
