import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { requireAuth, type AuthenticatedRequest } from './src/middleware/auth.ts';
import { getOrCreateUser } from './src/db/users.ts';
import { isDatabaseConfigured } from './src/db/index.ts';
import {
  getBootstrapData,
  syncFullState,
  recordActivityLog,
  type SimbaSnapshotPayload,
} from './src/db/simbaRepository.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '25mb' }));

// Authenticated user identity endpoint
app.get('/api/auth/me', requireAuth, async (req: AuthenticatedRequest, res) => {
  if (!isDatabaseConfigured()) {
    res.status(503).json({ error: 'Database backend is not configured.' });
    return;
  }
  try {
    const dbUser = await getOrCreateUser(req.user!.uid, req.user!.email || '');
    res.json({ user: dbUser });
  } catch (err) {
    console.error('Auth user sync error:', err);
    res.status(500).json({ error: 'Unable to verify user profile.' });
  }
});

// Load full normalized SIMBA snapshot from Cloud SQL PostgreSQL
app.get('/api/simba/bootstrap', requireAuth, async (req: AuthenticatedRequest, res) => {
  if (!isDatabaseConfigured()) {
    res.status(503).json({ error: 'Database backend is not configured.' });
    return;
  }
  try {
    const dbUser = await getOrCreateUser(req.user!.uid, req.user!.email || '');
    const data = await getBootstrapData();
    res.json({ ...data, user: dbUser });
  } catch (err) {
    console.error('SIMBA bootstrap error:', err);
    res.status(500).json({ error: 'Unable to retrieve SIMBA records.' });
  }
});

// Synchronize / persist SIMBA state atomically into PostgreSQL
app.post('/api/simba/sync', requireAuth, async (req: AuthenticatedRequest, res) => {
  if (!isDatabaseConfigured()) {
    res.status(503).json({ error: 'Database backend is not configured.' });
    return;
  }
  try {
    const dbUser = await getOrCreateUser(req.user!.uid, req.user!.email || '');
    const body = req.body as SimbaSnapshotPayload & { actionLabel?: string };
    if (!body || typeof body !== 'object') {
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
      dbUser.email,
      typeof body.actionLabel === 'string' && body.actionLabel.trim()
        ? body.actionLabel.trim()
        : 'SYNC_STATE'
    );

    res.json({ ok: true });
  } catch (err) {
    console.error('SIMBA sync error:', err);
    res.status(500).json({ error: 'Unable to save SIMBA records.' });
  }
});

// Record an audit log entry
app.post('/api/simba/logs', requireAuth, async (req: AuthenticatedRequest, res) => {
  if (!isDatabaseConfigured()) {
    res.status(503).json({ error: 'Database backend is not configured.' });
    return;
  }
  try {
    const dbUser = await getOrCreateUser(req.user!.uid, req.user!.email || '');
    const { aksi, modul, deskripsi } = req.body || {};
    if (typeof aksi !== 'string' || typeof modul !== 'string') {
      res.status(400).json({ error: 'Invalid log parameters.' });
      return;
    }
    const created = await recordActivityLog(aksi, modul, String(deskripsi || ''), dbUser.email);
    res.status(201).json({ log: created });
  } catch (err) {
    console.error('SIMBA audit log error:', err);
    res.status(500).json({ error: 'Unable to record activity log.' });
  }
});

async function startServer() {
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
