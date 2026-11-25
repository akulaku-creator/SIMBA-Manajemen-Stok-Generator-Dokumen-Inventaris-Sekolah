import 'dotenv/config';
import express, { type Request, type Response, type NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { requireAuth, type AuthenticatedRequest } from './src/middleware/auth.ts';
import { getOrCreateUser } from './src/db/users.ts';
import { isDatabaseConfigured } from './src/db/index.ts';
import {
  ForbiddenError,
  ValidationError,
  executePenerimaanViaStoredProcedure,
  executePenyaluranViaStoredProcedure,
  getBootstrapData,
  getDbAuditLogs,
  getLocalAuthSetupStatus,
  recordActivityLog,
  setupFirstRunLocalCredential,
  syncFullState,
  verifyAdminCredentialOnServer,
  verifyLocalLoginOnServer,
  type SimbaSnapshotPayload,
} from './src/db/simbaRepository.ts';
import { ensureDatabaseSecurityObjects } from './src/db/securityProcedures.ts';
import { signLocalSessionToken } from './src/lib/localSessionToken.ts';
import { validateNewCredentialStrength } from './src/utils/credentialHelper.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

const PORT = Number(process.env.PORT) || 3000;

// Security headers (iFrame-compatible for AI Studio preview: intentionally omits X-Frame-Options)
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

app.use(express.json({ limit: '25mb' }));

// Sliding-window rate limiter for API routes
interface RateEntry {
  count: number;
  resetAt: number;
  blockedUntil?: number;
}
const apiRateStore = new Map<string, RateEntry>();
const authFailureStore = new Map<string, RateEntry>();

function apiRateLimiter(req: Request, res: Response, next: NextFunction): void {
  const key = req.ip || 'unknown';
  const now = Date.now();
  const entry = apiRateStore.get(key);
  if (!entry || now > entry.resetAt) {
    apiRateStore.set(key, { count: 1, resetAt: now + 60_000 });
    next();
    return;
  }
  entry.count += 1;
  if (entry.count > 240) {
    res.status(429).json({ error: 'Terlalu banyak permintaan. Coba lagi sebentar.' });
    return;
  }
  next();
}

function getAuthFailureKey(req: Request, identifier: string): string {
  return `${req.ip || 'unknown'}::${identifier.trim().toLowerCase()}`;
}

function checkAuthLockout(key: string): number {
  const entry = authFailureStore.get(key);
  if (!entry?.blockedUntil) return 0;
  if (Date.now() >= entry.blockedUntil) {
    authFailureStore.delete(key);
    return 0;
  }
  return Math.ceil((entry.blockedUntil - Date.now()) / 1000);
}

function recordAuthFailure(key: string): { locked: boolean; remainingAttempts: number } {
  const now = Date.now();
  const existing = authFailureStore.get(key);
  const count = (!existing || now > existing.resetAt ? 0 : existing.count) + 1;
  if (count >= 5) {
    authFailureStore.set(key, {
      count,
      resetAt: now + 5 * 60_000,
      blockedUntil: now + 5 * 60_000,
    });
    return { locked: true, remainingAttempts: 0 };
  }
  authFailureStore.set(key, {
    count,
    resetAt: now + 5 * 60_000,
  });
  return { locked: false, remainingAttempts: 5 - count };
}

function clearAuthFailures(key: string): void {
  authFailureStore.delete(key);
}

app.use('/api', apiRateLimiter);

async function resolveActorRoleAndEmail(req: AuthenticatedRequest): Promise<{
  uid: string;
  email: string;
  role: 'admin' | 'operator' | 'user';
}> {
  if (req.user?.authProvider === 'local') {
    const role = req.user.localRole === 'admin'
      ? 'admin'
      : req.user.localRole === 'operator'
        ? 'operator'
        : 'user';
    return {
      uid: req.user.uid,
      email: req.user.email || `${req.user.localUsername || 'local'}@simba.local`,
      role,
    };
  }

  const dbUser = await getOrCreateUser(req.user!.uid, req.user!.email || '');
  const role = dbUser.role === 'admin' ? 'admin' : dbUser.role === 'operator' ? 'operator' : 'user';
  return {
    uid: dbUser.uid,
    email: dbUser.email,
    role,
  };
}

// Local auth setup status (no secret fields exposed)
app.get('/api/auth/setup-status', async (_req: Request, res: Response) => {
  if (!isDatabaseConfigured()) {
    res.json({ hasConfiguredLocalAdmin: false, hasEnvPasscode: Boolean((process.env.SIMBA_ADMIN_PASSCODE || '').trim()) });
    return;
  }
  try {
    const status = await getLocalAuthSetupStatus();
    res.json(status);
  } catch (err) {
    console.error('Auth setup status error:', err);
    res.status(500).json({ error: 'Unable to check authentication setup status.' });
  }
});

// Local username/NIP/email login verified server-side against scrypt hash or SIMBA_ADMIN_PASSCODE
app.post('/api/auth/local-login', async (req: Request, res: Response) => {
  if (!isDatabaseConfigured()) {
    res.status(503).json({ error: 'Database backend is not configured.' });
    return;
  }
  const { identifier, password } = req.body || {};
  if (typeof identifier !== 'string' || !identifier.trim()) {
    res.status(400).json({ error: 'Identitas pengguna wajib diisi.' });
    return;
  }

  const lockKey = getAuthFailureKey(req, identifier);
  const lockedSeconds = checkAuthLockout(lockKey);
  if (lockedSeconds > 0) {
    res.status(429).json({
      error: `Terlalu banyak percobaan gagal. Coba lagi dalam ${lockedSeconds} detik.`,
      retryAfterSeconds: lockedSeconds,
    });
    return;
  }

  try {
    const result = await verifyLocalLoginOnServer(identifier, typeof password === 'string' ? password : '');
    if (result.needsSetup) {
      res.status(200).json({
        authenticated: false,
        needsSetup: true,
        user: result.user,
      });
      return;
    }
    if (!result.authenticated || !result.user) {
      const fail = recordAuthFailure(lockKey);
      res.status(401).json({
        error: fail.locked
          ? 'Percobaan login gagal mencapai batas maksimum (5x). Akses dikunci 5 menit.'
          : `Kredensial tidak sesuai. Sisa kesempatan: ${fail.remainingAttempts} kali.`,
      });
      return;
    }

    clearAuthFailures(lockKey);
    const serverRole =
      result.user.role === 'admin' ? 'admin' : result.user.role === 'operator' ? 'operator' : 'user';
    const sessionToken = signLocalSessionToken({
      uid: `local:${result.user.id}`,
      email: result.user.email || `${result.user.username}@simba.local`,
      role: serverRole,
      username: result.user.username,
    });

    await recordActivityLog(
      'LOGIN',
      'AUTH',
      `Login lokal berhasil sebagai ${result.user.role} (@${result.user.username}).`,
      result.user.email || result.user.username
    ).catch(() => {});

    res.json({
      authenticated: true,
      needsSetup: false,
      user: result.user,
      sessionToken,
    });
  } catch (err) {
    console.error('Local login error:', err);
    res.status(500).json({ error: 'Unable to process login.' });
  }
});

// First-run local credential setup (rejected if account already has an active credential)
app.post('/api/auth/setup-credential', async (req: Request, res: Response) => {
  if (!isDatabaseConfigured()) {
    res.status(503).json({ error: 'Database backend is not configured.' });
    return;
  }
  const { identifier, newPassword } = req.body || {};
  if (typeof identifier !== 'string' || typeof newPassword !== 'string') {
    res.status(400).json({ error: 'Permintaan aktivasi akun tidak lengkap.' });
    return;
  }

  const strengthErr = validateNewCredentialStrength(newPassword);
  if (strengthErr) {
    res.status(400).json({ error: strengthErr });
    return;
  }

  try {
    const updatedUser = await setupFirstRunLocalCredential(identifier, newPassword);
    const serverRole =
      updatedUser.role === 'admin' ? 'admin' : updatedUser.role === 'operator' ? 'operator' : 'user';
    const sessionToken = signLocalSessionToken({
      uid: `local:${updatedUser.id}`,
      email: updatedUser.email || `${updatedUser.username}@simba.local`,
      role: serverRole,
      username: updatedUser.username,
    });

    await recordActivityLog(
      'SETUP_CREDENTIAL',
      'AUTH',
      `Aktivasi kredensial pertama kali untuk @${updatedUser.username}.`,
      updatedUser.email || updatedUser.username
    ).catch(() => {});

    res.json({
      authenticated: true,
      user: updatedUser,
      sessionToken,
    });
  } catch (err: any) {
    if (err instanceof ForbiddenError) {
      res.status(403).json({ error: err.message });
      return;
    }
    if (err instanceof ValidationError) {
      res.status(400).json({ error: err.message });
      return;
    }
    console.error('Setup credential error:', err);
    res.status(500).json({ error: 'Unable to configure local credential.' });
  }
});

// Server-side Admin PIN / Passcode verification for high-risk actions (Reset Data / Restore DB)
app.post('/api/auth/verify-admin', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  if (!isDatabaseConfigured()) {
    res.status(503).json({ error: 'Database backend is not configured.' });
    return;
  }
  const { secret } = req.body || {};
  if (typeof secret !== 'string' || !secret.trim()) {
    res.status(400).json({ error: 'Kata sandi atau PIN Admin wajib diisi.' });
    return;
  }

  try {
    const actor = await resolveActorRoleAndEmail(req);
    if (actor.role !== 'admin') {
      res.status(403).json({ error: 'Akses Ditolak: Hanya Administrator yang berwenang.' });
      return;
    }

    const lockKey = getAuthFailureKey(req, `admin:${actor.uid}`);
    const lockedSeconds = checkAuthLockout(lockKey);
    if (lockedSeconds > 0) {
      res.status(429).json({
        error: `Terlalu banyak percobaan PIN salah. Tunggu ${lockedSeconds} detik.`,
      });
      return;
    }

    const result = await verifyAdminCredentialOnServer(actor, secret);
    if (!result.hasConfiguredCredential) {
      res.json({ verified: false, hasConfiguredCredential: false });
      return;
    }

    if (!result.valid) {
      recordAuthFailure(lockKey);
      res.status(401).json({ error: 'PIN atau Kata Sandi Administrator tidak sesuai.' });
      return;
    }

    clearAuthFailures(lockKey);
    res.json({ verified: true, hasConfiguredCredential: true });
  } catch (err) {
    if (err instanceof ForbiddenError) {
      res.status(403).json({ error: err.message });
      return;
    }
    console.error('Verify admin error:', err);
    res.status(500).json({ error: 'Unable to verify administrator credentials.' });
  }
});

// Authenticated user identity endpoint
app.get('/api/auth/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  if (!isDatabaseConfigured()) {
    res.status(503).json({ error: 'Database backend is not configured.' });
    return;
  }
  try {
    const actor = await resolveActorRoleAndEmail(req);
    res.json({ user: actor });
  } catch (err) {
    console.error('Auth user sync error:', err);
    res.status(500).json({ error: 'Unable to verify user profile.' });
  }
});

// Load full normalized SIMBA snapshot from Cloud SQL PostgreSQL
app.get('/api/simba/bootstrap', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  if (!isDatabaseConfigured()) {
    res.status(503).json({ error: 'Database backend is not configured.' });
    return;
  }
  try {
    const actor = await resolveActorRoleAndEmail(req);
    const data = await getBootstrapData();
    res.json({ ...data, user: actor });
  } catch (err) {
    console.error('SIMBA bootstrap error:', err);
    res.status(500).json({ error: 'Unable to retrieve SIMBA records.' });
  }
});

// Synchronize / persist SIMBA state atomically into PostgreSQL with RBAC & Advisory Lock
app.post('/api/simba/sync', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  if (!isDatabaseConfigured()) {
    res.status(503).json({ error: 'Database backend is not configured.' });
    return;
  }
  try {
    const actor = await resolveActorRoleAndEmail(req);
    if (actor.role !== 'admin' && actor.role !== 'operator') {
      res.status(403).json({ error: 'Akses Ditolak: Anda tidak memiliki izin menyimpan perubahan ke basis data.' });
      return;
    }

    const body = req.body as SimbaSnapshotPayload & { actionLabel?: string };
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      res.status(400).json({ error: 'Invalid request payload.' });
      return;
    }

    await syncFullState(
      {
        kategoriList: body.kategoriList,
        masterBarang: body.masterBarang,
        pejabatList: body.pejabatList,
        penerimaanList: body.penerimaanList,
        transaksiList: body.transaksiList,
        kopConfig: body.kopConfig,
        numberingConfig: body.numberingConfig,
        userList: body.userList,
      },
      actor,
      typeof body.actionLabel === 'string' && body.actionLabel.trim()
        ? body.actionLabel.trim()
        : 'SYNC_STATE'
    );

    res.json({ ok: true });
  } catch (err) {
    if (err instanceof ForbiddenError) {
      res.status(403).json({ error: err.message });
      return;
    }
    if (err instanceof ValidationError) {
      res.status(400).json({ error: err.message });
      return;
    }
    console.error('SIMBA sync error:', err);
    res.status(500).json({ error: 'Unable to save SIMBA records.' });
  }
});

// Atomic Stored Procedure endpoints for primary stock transactions (Penerimaan & Penyaluran)
app.post('/api/simba/penerimaan', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  if (!isDatabaseConfigured()) {
    res.status(503).json({ error: 'Database backend is not configured.' });
    return;
  }
  try {
    const actor = await resolveActorRoleAndEmail(req);
    const result = await executePenerimaanViaStoredProcedure(req.body, actor);
    res.status(201).json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof ForbiddenError) {
      res.status(403).json({ error: err.message });
      return;
    }
    if (err instanceof ValidationError) {
      res.status(400).json({ error: err.message });
      return;
    }
    console.error('SIMBA SP penerimaan error:', err);
    res.status(500).json({ error: 'Gagal memproses transaksi penerimaan barang.' });
  }
});

app.post('/api/simba/penyaluran', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  if (!isDatabaseConfigured()) {
    res.status(503).json({ error: 'Database backend is not configured.' });
    return;
  }
  try {
    const actor = await resolveActorRoleAndEmail(req);
    const result = await executePenyaluranViaStoredProcedure(req.body, actor);
    res.status(201).json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof ForbiddenError) {
      res.status(403).json({ error: err.message });
      return;
    }
    if (err instanceof ValidationError) {
      res.status(400).json({ error: err.message });
      return;
    }
    console.error('SIMBA SP penyaluran error:', err);
    res.status(500).json({ error: 'Gagal memproses transaksi penyaluran barang.' });
  }
});

// Read-only database-level Audit Trigger history (Admin only)
app.get('/api/simba/db-audit-logs', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  if (!isDatabaseConfigured()) {
    res.status(503).json({ error: 'Database backend is not configured.' });
    return;
  }
  try {
    const actor = await resolveActorRoleAndEmail(req);
    if (actor.role !== 'admin') {
      res.status(403).json({ error: 'Akses Ditolak: Hanya Administrator yang dapat mengakses log audit database.' });
      return;
    }
    const limitParam = Number(req.query.limit || 100);
    const logs = await getDbAuditLogs(Number.isFinite(limitParam) ? limitParam : 100);
    res.json({ logs });
  } catch (err) {
    console.error('SIMBA db audit logs error:', err);
    res.status(500).json({ error: 'Unable to fetch database audit logs.' });
  }
});

// Record an audit log entry
app.post('/api/simba/logs', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  if (!isDatabaseConfigured()) {
    res.status(503).json({ error: 'Database backend is not configured.' });
    return;
  }
  try {
    const actor = await resolveActorRoleAndEmail(req);
    const { aksi, modul, deskripsi } = req.body || {};
    if (typeof aksi !== 'string' || typeof modul !== 'string') {
      res.status(400).json({ error: 'Invalid log parameters.' });
      return;
    }
    const created = await recordActivityLog(aksi, modul, String(deskripsi || ''), actor.email);
    res.status(201).json({ log: created });
  } catch (err) {
    console.error('SIMBA audit log error:', err);
    res.status(500).json({ error: 'Unable to record activity log.' });
  }
});

async function startServer() {
  if (isDatabaseConfigured()) {
    try {
      await ensureDatabaseSecurityObjects();
    } catch (err) {
      console.error('Failed to install PostgreSQL security procedures/triggers:', err);
    }
  }
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
