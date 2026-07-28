import express from 'express';
import cors from 'cors';
import path from 'path';
import { initializeSchema } from './db.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authMiddleware } from './middleware/Auth.js';

import settingsRouter from './routes/settings.js';
import productsRouter from './routes/products.js';
import ordersRouter from './routes/orders.js';
import financialRouter from './routes/financial.js';
import suppliersRouter from './routes/suppliers.js';
import stateRouter from './routes/state.js';
import aiRouter from './routes/ai.js';
import aiKeysRouter from './routes/aiKeys.js';
import contactsRouter from './routes/contacts.js';
import couponsRouter from './routes/coupons.js';
import importRouter from './routes/import.js';
import checkpointRouter from './routes/checkpoints.js';
import easyOrdersRouter from './routes/easyOrders.js';
import customersRouter from './routes/customers.js';
import authRouter from './routes/Auth.js';

const app = express();

// Lazy schema initialization — runs on first request, not at module load
let schemaInitPromise = null;
app.use(async (req, res, next) => {
  if (!schemaInitPromise) {
    schemaInitPromise = initializeSchema().catch(err => {
      console.error('Schema init error:', err);
    });
  }
  await schemaInitPromise;
  next();
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));
if (!process.env.VERCEL) {
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
}

// Public routes (no auth required)
app.use(authRouter);

// Auth middleware protects all API routes except /api/auth
app.use(authMiddleware);

app.use(settingsRouter);
app.use(productsRouter);
app.use(ordersRouter);
app.use(financialRouter);
app.use(suppliersRouter);
app.use(stateRouter);
app.use(aiRouter);
app.use(aiKeysRouter);
app.use(contactsRouter);
app.use(couponsRouter);
app.use(importRouter);
app.use(checkpointRouter);
app.use(easyOrdersRouter);
app.use(customersRouter);

app.use(errorHandler);

// Auto-polling for EasyOrders (non-Vercel only)
if (!process.env.VERCEL) {
  let pollTimer = null;

  async function pollOrders() {
    try {
      const { getDb } = await import('./db.js');
      const configRow = await getDb("SELECT value FROM settings WHERE key = 'easyorders_config'");
      const config = configRow ? JSON.parse(configRow.value) : {};
      if (!config.enabled || !config.apiKey || config.autoSyncOrders === false) return;

      const { default: fetch } = await import('node-fetch');
      const lastPollRow = await getDb("SELECT value FROM settings WHERE key = 'easyorders_last_poll'");
      const lastPoll = lastPollRow?.value || '';

      let page = 1;
      let hasMore = true;
      const allOrders = [];

      while (hasMore) {
        const filterParam = 'filter=created_at||gt||' + encodeURIComponent(lastPoll || '2020-01-01');
        const url = `https://api.easy-orders.net/api/v1/external-apps/orders?${filterParam}&page=${page}&limit=50`;
        const resp = await fetch(url, { headers: { 'Api-Key': config.apiKey } });
        if (!resp.ok) break;
        const data = await resp.json();
        const orders = Array.isArray(data) ? data : (data.orders || data.data || []);
        allOrders.push(...orders);
        hasMore = orders.length === 50;
        page++;
      }

      const { runDb: runDbFn } = await import('./db.js');
      await runDbFn("INSERT OR REPLACE INTO settings (key, value) VALUES ('easyorders_last_poll', ?)", [new Date().toISOString()]);

      const { mapEasyOrderToErp } = await import('./utils/easyOrdersClient.js');
      const { allDb: allDbFn, addSyncLog: addSyncLogFn } = await import('./db.js');

      for (const easyOrder of allOrders) {
        const existing = await (await import('./db.js')).getDb("SELECT id FROM easyorders_staging WHERE easy_order_id = ?", [easyOrder.id || easyOrder._id]);
        if (existing) continue;
        const erpOrder = await mapEasyOrderToErp(easyOrder);
        const stagingId = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
        await runDbFn("INSERT OR REPLACE INTO easyorders_staging (id, easy_order_id, data, status, source_order_status) VALUES (?, ?, ?, ?, ?)", [stagingId, easyOrder.id || easyOrder._id, JSON.stringify(erpOrder), 'pending', easyOrder.status]);
      }

      if (allOrders.length > 0) {
        await addSyncLogFn('poll', 'inbound', 'order', '', 'success', `Auto-poll: تم جلب ${allOrders.length} طلب`);
      }
    } catch (err) {
      console.error('Auto-poll error:', err.message);
    }
  }

  startAutoPoll();

  async function startAutoPoll() {
    try {
      const { getDb } = await import('./db.js');
      const configRow = await getDb("SELECT value FROM settings WHERE key = 'easyorders_config'");
      const config = configRow ? JSON.parse(configRow.value) : {};
      if (config.enabled && config.autoSyncOrders !== false) {
        const interval = Math.max(30, Math.min(300, config.pollInterval || 60)) * 1000;
        pollTimer = setInterval(pollOrders, interval);
        console.log(`Auto-poll started: every ${interval / 1000}s`);
      }
    } catch (e) {}
  }
}

export default app;
