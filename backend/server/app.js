import express from 'express';
import cors from 'cors';
import path from 'path';
import { initializeSchema } from './db.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authMiddleware } from './middleware/auth.js';

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
import authRouter from './routes/auth.js';

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

export default app;
