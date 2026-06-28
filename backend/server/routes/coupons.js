import { Router } from 'express';
import { allDb, getDb, runDb } from '../db.js';

const router = Router();

router.get('/api/coupons', async (req, res) => {
  try {
    const rows = await allDb("SELECT code, discount, is_percent FROM saved_coupons ORDER BY updated_at DESC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/api/coupons', async (req, res) => {
  try {
    const { code, discount, is_percent } = req.body;
    if (!code || !code.trim()) return res.status(400).json({ error: 'كود الكوبون مطلوب' });
    const isPct = is_percent ? 1 : 0;
    await runDb(
      "INSERT INTO saved_coupons (code, discount, is_percent, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP) ON CONFLICT(code) DO UPDATE SET discount = ?, is_percent = ?, updated_at = CURRENT_TIMESTAMP",
      [code.toUpperCase(), discount || 0, isPct, discount || 0, isPct]
    );
    res.json({ success: true, code: code.toUpperCase(), discount: discount || 0, is_percent: !!is_percent });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/api/coupons/:code', async (req, res) => {
  try {
    await runDb("DELETE FROM saved_coupons WHERE code = ?", [req.params.code.toUpperCase()]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
