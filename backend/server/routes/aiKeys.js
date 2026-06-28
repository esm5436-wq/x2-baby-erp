import { Router } from 'express';
import { getDb, runDb, logActivity } from '../db.js';

const router = Router();

async function getKeys() {
  const row = await getDb("SELECT value FROM settings WHERE key = 'ai_api_keys'");
  if (!row) return [];
  try { return JSON.parse(row.value); } catch { return []; }
}

async function saveKeys(keys) {
  await runDb("INSERT OR REPLACE INTO settings (key, value) VALUES ('ai_api_keys', ?)",
    [JSON.stringify(keys)]);
}

router.get('/api/ai-keys', async (req, res) => {
  try {
    const keys = await getKeys();
    res.json({ keys });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/api/ai-keys', async (req, res) => {
  try {
    const { key } = req.body;
    if (!key || typeof key !== 'string' || !key.trim()) {
      return res.status(400).json({ error: 'يرجى إدخال مفتاح API صالح' });
    }
    const keys = await getKeys();
    keys.push(key.trim());
    await saveKeys(keys);
    logActivity('create', 'settings', 'ai_api_keys', 'تم إضافة مفتاح AI API جديد');
    res.json({ keys });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/api/ai-keys/reorder', async (req, res) => {
  try {
    const { keys: newOrder } = req.body;
    if (!Array.isArray(newOrder)) {
      return res.status(400).json({ error: 'البيانات المرسلة غير صالحة' });
    }
    await saveKeys(newOrder);
    logActivity('update', 'settings', 'ai_api_keys', 'تم إعادة ترتيب مفاتيح AI API');
    res.json({ keys: newOrder });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/api/ai-keys/:index', async (req, res) => {
  try {
    const index = parseInt(req.params.index, 10);
    if (isNaN(index) || index < 0) {
      return res.status(400).json({ error: 'فهرس غير صالح' });
    }
    const { key } = req.body;
    if (!key || typeof key !== 'string' || !key.trim()) {
      return res.status(400).json({ error: 'يرجى إدخال مفتاح API صالح' });
    }
    const keys = await getKeys();
    if (index >= keys.length) {
      return res.status(404).json({ error: 'المفتاح غير موجود' });
    }
    keys[index] = key.trim();
    await saveKeys(keys);
    logActivity('update', 'settings', 'ai_api_keys', `تم تعديل المفتاح ${index + 1}`);
    res.json({ keys });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/api/ai-keys/:index', async (req, res) => {
  try {
    const index = parseInt(req.params.index, 10);
    if (isNaN(index) || index < 0) {
      return res.status(400).json({ error: 'فهرس غير صالح' });
    }
    const keys = await getKeys();
    if (index >= keys.length) {
      return res.status(404).json({ error: 'المفتاح غير موجود' });
    }
    keys.splice(index, 1);
    await saveKeys(keys);
    logActivity('delete', 'settings', 'ai_api_keys', `تم حذف المفتاح ${index + 1}`);
    res.json({ keys });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
