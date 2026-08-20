import express from 'express';
import cors from 'cors';
import path from 'path';
import { initializeSchema } from './db.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authMiddleware } from './middleware/Auth.js';
import { requireRoutePermission } from './middleware/Permission.js';

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
import customersRouter from './routes/customers.js';
import usersRouter from './routes/users.js';
import authRouter from './routes/Auth.js';
import notesRouter from './routes/notes.js';

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
  const distPath = path.join(process.cwd(), '..', 'frontend', 'dist');
  app.use(express.static(distPath));
}

// Public routes (no auth required)
app.use(authRouter);

// Auth middleware protects all API routes except /api/auth
app.use(authMiddleware);

// Permission middleware enforces view/edit per section (admins always pass)
app.use(requireRoutePermission);

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
app.use(customersRouter);
app.use(usersRouter);
app.use(notesRouter);

app.use(errorHandler);

// SPA fallback for local development
if (!process.env.VERCEL) {
  const distPath = path.join(process.cwd(), '..', 'frontend', 'dist');
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

export default app;
