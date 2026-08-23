import { Router } from 'express';
import { callGemini } from '../utils/aiClient.js';
import { getDb, allDb, runDb } from '../db.js';

const router = Router();

router.post('/api/ai/chat', async (req, res) => {
  const { messages } = req.body;
  const refreshState = { current: false };

  try {
    const result = await callGemini(messages, refreshState);
    return res.json({ content: result.content, refreshRequired: result.refreshRequired });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ error: error.message });
  }
});

// ====== المحادثات المحفوظة ======

router.get('/api/ai/conversations', async (req, res) => {
  try {
    const rows = await allDb(
      "SELECT id, title, updated_at as updatedAt, LENGTH(messages) as size FROM ai_conversations ORDER BY updated_at DESC LIMIT 100"
    );
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/api/ai/conversations/:id', async (req, res) => {
  try {
    const row = await getDb("SELECT id, title, messages, updated_at as updatedAt FROM ai_conversations WHERE id = ?", [req.params.id]);
    if (!row) return res.status(404).json({ error: 'المحادثة غير موجودة' });
    let messages = [];
    try { messages = JSON.parse(row.messages); } catch {}
    return res.json({ id: row.id, title: row.title, messages, updatedAt: row.updatedAt });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/api/ai/conversations', async (req, res) => {
  try {
    const { id, title, messages } = req.body;
    if (!id || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'بيانات ناقصة (id, messages)' });
    }
    const safeTitle = String(title || messages.find(m => m.role === 'user')?.content || 'محادثة جديدة').slice(0, 80);
    await runDb(
      `INSERT INTO ai_conversations (id, title, messages, updated_at)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(id) DO UPDATE SET title = excluded.title, messages = excluded.messages, updated_at = CURRENT_TIMESTAMP`,
      [id, safeTitle, JSON.stringify(messages.slice(-100))]
    );
    return res.json({ success: true, id, title: safeTitle });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.delete('/api/ai/conversations/:id', async (req, res) => {
  try {
    await runDb("DELETE FROM ai_conversations WHERE id = ?", [req.params.id]);
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
