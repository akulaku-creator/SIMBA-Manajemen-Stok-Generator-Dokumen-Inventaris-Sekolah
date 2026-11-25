import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const EPHEMERAL_SESSION_SECRET = randomBytes(32);

function getSessionSecret(): Buffer {
  const configured = (process.env.SIMBA_SESSION_SECRET || '').trim();
  if (configured.length >= 16) {
    return Buffer.from(configured, 'utf8');
  }
  return EPHEMERAL_SESSION_SECRET;
}

export interface LocalSessionClaims {
  uid: string;
  email: string;
  role: 'admin' | 'operator' | 'user';
  username: string;
  exp: number;
}

const LOCAL_TOKEN_PREFIX = 'simba_local.';
const DEFAULT_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

export function signLocalSessionToken(claims: Omit<LocalSessionClaims, 'exp'>): string {
  const payload: LocalSessionClaims = {
    ...claims,
    exp: Date.now() + DEFAULT_TTL_MS,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sigB64 = createHmac('sha256', getSessionSecret())
    .update(payloadB64)
    .digest('base64url');
  return `${LOCAL_TOKEN_PREFIX}${payloadB64}.${sigB64}`;
}

export function verifyLocalSessionToken(token: string): LocalSessionClaims | null {
  if (!token || !token.startsWith(LOCAL_TOKEN_PREFIX)) return null;
  const rest = token.slice(LOCAL_TOKEN_PREFIX.length);
  const parts = rest.split('.');
  if (parts.length !== 2) return null;

  const [payloadB64, sigB64] = parts;
  if (!payloadB64 || !sigB64) return null;

  const expectedSig = createHmac('sha256', getSessionSecret())
    .update(payloadB64)
    .digest();

  let providedSig: Buffer;
  try {
    providedSig = Buffer.from(sigB64, 'base64url');
  } catch {
    return null;
  }

  if (providedSig.length !== expectedSig.length || !timingSafeEqual(providedSig, expectedSig)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as LocalSessionClaims;
    if (!parsed || typeof parsed.uid !== 'string' || typeof parsed.exp !== 'number') {
      return null;
    }
    if (Date.now() > parsed.exp) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function hashServerCredential(secret: string): string {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(secret.trim(), salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

export function verifyServerCredential(candidate: string, storedHash?: string | null): boolean {
  const clean = (candidate || '').trim();
  if (!clean || !storedHash || !storedHash.startsWith('scrypt$')) return false;
  const parts = storedHash.slice('scrypt$'.length).split('$');
  if (parts.length !== 2) return false;
  const [salt, expectedHex] = parts;
  if (!salt || !expectedHex) return false;

  try {
    const expectedBuf = Buffer.from(expectedHex, 'hex');
    const actualBuf = scryptSync(clean, salt, 64);
    return actualBuf.length === expectedBuf.length && timingSafeEqual(actualBuf, expectedBuf);
  } catch {
    return false;
  }
}

export function verifyEnvPasscode(candidate: string): boolean {
  const envCode = (process.env.SIMBA_ADMIN_PASSCODE || '').trim();
  const clean = (candidate || '').trim();
  if (!envCode || !clean) return false;
  const a = Buffer.from(clean, 'utf8');
  const b = Buffer.from(envCode, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}
