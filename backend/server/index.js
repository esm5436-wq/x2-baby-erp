import app from './app.js';
import { backfillOrdersAsync } from './backfill.js';

const PORT = process.env.PORT || 3001;

process.on('unhandledRejection', (reason) => {
    console.error('[FATAL] Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('[FATAL] Uncaught Exception:', err);
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Backend API running at http://localhost:${PORT}`);
    backfillOrdersAsync();
});
