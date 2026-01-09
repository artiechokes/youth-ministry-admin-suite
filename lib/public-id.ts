import crypto from 'crypto';

const DEFAULT_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generatePublicId(prefix: string, length = 6, alphabet = DEFAULT_ALPHABET) {
  const bytes = crypto.randomBytes(length);
  const chars = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]);
  return `${prefix}-${chars.join('')}`;
}
