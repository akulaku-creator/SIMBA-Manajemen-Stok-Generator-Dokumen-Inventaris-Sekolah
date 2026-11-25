import type { AppUser } from '../types';

const CREDENTIAL_HASH_PREFIX = 'sha256$';
const MIN_CREDENTIAL_LENGTH = 6;
const WEAK_DEFAULT_SECRETS = new Set(['123456', 'admin', 'operator', 'guru', 'password', '000000']);

// In-memory local API session token (never persisted to localStorage)
let inMemoryLocalApiToken: string | null = null;

export function setLocalApiToken(token: string | null): void {
  inMemoryLocalApiToken = token ? token.trim() : null;
}

export function getLocalApiToken(): string | null {
  return inMemoryLocalApiToken;
}

export function clearLocalApiToken(): void {
  inMemoryLocalApiToken = null;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function sha256Hex(value: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoded = new TextEncoder().encode(value);
    const digest = await crypto.subtle.digest('SHA-256', encoded);
    return toHex(new Uint8Array(digest));
  }
  throw new Error('Web Crypto API tidak tersedia di browser ini.');
}

export function validateNewCredentialStrength(secret: string): string | null {
  const trimmed = secret.trim();
  if (trimmed.length < MIN_CREDENTIAL_LENGTH) {
    return `Kata sandi / PIN minimal ${MIN_CREDENTIAL_LENGTH} karakter.`;
  }
  if (WEAK_DEFAULT_SECRETS.has(trimmed.toLowerCase())) {
    return 'Gunakan kata sandi / PIN unik yang kuat (jangan gunakan kode bawaan seperti 123456 atau admin).';
  }
  return null;
}

/**
 * Hashes a user password or PIN in the browser using a random 16-byte salt + SHA-256.
 */
export async function hashClientCredential(secret: string): Promise<string> {
  const saltBytes = new Uint8Array(16);
  crypto.getRandomValues(saltBytes);
  const saltHex = toHex(saltBytes);
  const hashHex = await sha256Hex(`${saltHex}:${secret.trim()}`);
  return `${CREDENTIAL_HASH_PREFIX}${saltHex}$${hashHex}`;
}

/**
 * Verifies a plaintext password or PIN against a stored salted SHA-256 hash.
 */
export async function verifyClientCredential(
  candidate: string,
  storedHash?: string | null
): Promise<boolean> {
  const cleanCandidate = candidate.trim();
  if (!cleanCandidate || !storedHash) return false;
  if (!storedHash.startsWith(CREDENTIAL_HASH_PREFIX)) return false;

  const rest = storedHash.slice(CREDENTIAL_HASH_PREFIX.length);
  const parts = rest.split('$');
  if (parts.length !== 2) return false;

  const [saltHex, expectedHex] = parts;
  if (!saltHex || !expectedHex) return false;

  const actualHex = await sha256Hex(`${saltHex}:${cleanCandidate}`);
  return constantTimeEqual(actualHex, expectedHex);
}

/**
 * Removes plaintext password/pin fields from AppUser objects before persistence or export.
 */
export function sanitizeUserForStorage(user: AppUser): AppUser {
  const { password: _p, pin: _pin, ...safe } = user;
  return {
    ...safe,
    requiresPasswordSetup: safe.requiresPasswordSetup ?? !safe.passwordHash,
  };
}

export function sanitizeUsersForPersistence(users: AppUser[]): AppUser[] {
  return users.map(sanitizeUserForStorage);
}
