import { Router } from 'express';
import { allDb, getDb, runDb, logActivity } from '../db.js';
import crypto from 'crypto';

const router = Router();

const ENTITY_TYPES = ['product', 'order', 'purchase', 'contact', 'customer'];

router.get('/api/notes', async (req, res) => {
  try {
    const { entityType, entityId } = req.query;
    if (!entityType || !entityId) {
      return res.status(400).json({ error: 'entityType and entityId are required' });
    }
    if (!ENTITY_TYPES.includes(entityType)) {
      return res.status(400).json({ error: 'Invalid entity type' });
    }
    const rows = await allDb(
      "SELECT * FROM notes WHERE entity_type = ? AND entity_id = ? ORDER BY created_at DESC",
      [entityType, entityId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/api/notes', async (req, res) => {
  try {
    const { entityType, entityId, content, attachment, showToCustomer } = req.body;
    if (!entityType || !entityId || !content || !content.trim()) {
      return res.status(400).json({ error: 'entityType, entityId, and content are required' });
    }
    if (!ENTITY_TYPES.includes(entityType)) {
      return res.status(400).json({ error: 'Invalid entity type' });
    }
    const createdBy = req.user?.username || 'unknown';
    const id = `note-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const now = new Date().toISOString();

    await runDb(
      `INSERT INTO notes (id, entity_type, entity_id, content, attachment, show_to_customer, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, entityType, entityId, content.trim(), attachment || null, showToCustomer ? 1 : 0, createdBy, now]
    );

    const note = await getDb("SELECT * FROM notes WHERE id = ?", [id]);
    await logActivity('create', 'note', id, `ملاحظة جديدة على ${entityType}: ${entityId}`, {
      entityType, entityId, noteType: showToCustomer ? 'customer' : 'internal'
    });
    res.json(note);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/api/notes/:id', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'فقط المسؤول يمكنه حذف الملاحظات' });
    }
    const note = await getDb("SELECT * FROM notes WHERE id = ?", [req.params.id]);
    if (!note) return res.status(404).json({ error: 'الملاحظة غير موجودة' });
    await runDb("DELETE FROM notes WHERE id = ?", [req.params.id]);
    await logActivity('delete', 'note', req.params.id, `حذف ملاحظة من ${note.entity_type}: ${note.entity_id}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
