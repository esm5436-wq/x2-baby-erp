import { Router } from 'express';
import { allDb, runDb, logActivity } from '../db.js';

const router = Router();

router.post('/api/settings', async (req, res) => {
    try {
        const { key, value } = req.body;
        const prevRow = await allDb("SELECT value FROM settings WHERE key = ?", [key]);
        const previousState = { value: prevRow.length ? prevRow[0].value : undefined };
        await runDb("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
            [key, typeof value === 'string' ? value : JSON.stringify(value)]);
        const newState = { value };
        const activityLogId = await logActivity('update', 'settings', key, `تم تحديث الإعداد ${key}`, { previousState, newState });
        res.json({ success: true, activityLogId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
