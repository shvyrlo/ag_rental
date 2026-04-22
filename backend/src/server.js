import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import { runMigrations } from './db.js';
import { ensureAdmin, ensureDefaultClient, ensureDefaultMechanic } from './bootstrap.js';
import authRouter from './routes/auth.js';
import usersRouter from './routes/users.js';
import equipmentRouter from './routes/equipment.js';
import rentalsRouter from './routes/rentals.js';
import inspectionsRouter from './routes/inspections.js';
import paymentsRouter from './routes/payments.js';
import repairClaimsRouter from './routes/repairClaims.js';
import leaseApplicationsRouter from './routes/leaseApplications.js';
import qrCodesRouter, { redirectHandler as qrRedirectHandler } from './routes/qrCodes.js';

const app = express();
const PORT = Number(process.env.PORT || 4000);

// Allow the configured origin; fall back to wildcard in dev.
const corsOrigin = process.env.CORS_ORIGIN || '*';
app.use(cors({
  origin: corsOrigin === '*' ? true : corsOrigin.split(',').map(s => s.trim()),
  credentials: true,
}));
// Larger limit so lease applications and inspection photo sets
// (6 photos per inspection) can embed base64 uploads.
app.use(express.json({ limit: '100mb' }));

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/auth', authRouter);
app.use('/users', usersRouter);
app.use('/equipment', equipmentRouter);
app.use('/rentals', rentalsRouter);
app.use('/inspections', inspectionsRouter);
app.use('/payments', paymentsRouter);
app.use('/repair-claims', repairClaimsRouter);
app.use('/lease-applications', leaseApplicationsRouter);
app.use('/qr-codes', qrCodesRouter);

// Public QR scan redirect — no auth, no CORS involved (it's an HTTP redirect).
app.get('/r/:slug', qrRedirectHandler);

app.use((err, _req, res, _next) => {
  console.error('unhandled', err);
  res.status(500).json({ error: 'Server error' });
});

async function start() {
  try {
    await runMigrations();
    await ensureAdmin();
    await ensureDefaultClient();
    await ensureDefaultMechanic();
  } catch (err) {
    console.error('startup failed', err);
    process.exit(1);
  }
  app.listen(PORT, () => {
    console.log(`[api] listening on :${PORT}`);
  });
}

start();
