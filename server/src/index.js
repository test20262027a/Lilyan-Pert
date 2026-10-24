import express from 'express';
import { q } from './db.js';
import { migrate, seed } from './seed.js';
import { attachSession } from './auth.js';
import { HttpError } from './lib/http.js';
import { activityLogger } from './lib/activity.js';
import authRoutes from './routes/auth-routes.js';
import businessRoutes from './routes/business.js';
import catalogRoutes from './routes/catalog.js';
import orderRoutes from './routes/orders.js';
import dashboardRoutes from './routes/dashboard.js';
import manageRoutes from './routes/manage.js';
import backupRoutes from './routes/backups.js';
import publicRoutes from './routes/public.js';
import activityRoutes from './routes/activity.js';
import translateRoutes from './routes/translate.js';

const app = express();
app.set('trust proxy', true);
app.disable('x-powered-by');
app.use(express.json({ limit: '12mb' }));
app.use(attachSession);
// Records authorized changes for the Activity Reports page — see lib/activity.js.
app.use(activityLogger);

app.get('/api/health', async (_req, res) => {
  try {
    await q('SELECT 1');
    res.json({ ok: true, service: 'lilyan-pert-api', time: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ ok: false, error: err.message });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/business', businessRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/manage', manageRoutes);
app.use('/api/backups', backupRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/text', translateRoutes);

app.use((_req, res) => res.status(404).json({ error: 'NOT_FOUND' }));

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.code, message: err.message });
  }
  console.error('[api] unhandled error:', err);
  res.status(500).json({ error: 'SERVER_ERROR' });
});

const port = Number(process.env.PORT || 8000);

async function start() {
  let attempt = 0;
  for (;;) {
    try {
      await migrate();
      await seed();
      break;
    } catch (err) {
      attempt += 1;
      if (attempt > 20) throw err;
      console.warn(`[api] database not ready (${err.message}) — retrying`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  app.listen(port, '0.0.0.0', () => {
    console.log(`[api] Lilyan Pert API listening on 0.0.0.0:${port}`);
  });
}

start().catch((err) => {
  console.error('[api] failed to start', err);
  process.exit(1);
});
