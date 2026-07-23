import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { getDb, allDb, runDb, logActivity } from '../db.js';

const router = Router();

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'هذه الخاصية متاحة للمدير فقط' });
  }
  next();
}

const DEFAULT_PERMISSIONS = {
  products: { view: false, edit: false },
  orders: { view: false, edit: false },
  customers: { view: false, edit: false },
  contacts: { view: false, edit: false },
  suppliers: { view: false, edit: false },
  purchases: { view: false, edit: false },
  accounts: { view: false, edit: false },
  settings: { view: false, edit: false },
  ai: { view: false, edit: false },
  'activity-logs': { view: false, edit: false },
};

router.get('/api/users', requireAdmin, async (req, res) => {
  try {
    const rows = await allDb("SELECT id, username, role, permissions, last_login, created_at, created_by, can_change_password FROM users ORDER BY id");
    res.json({ users: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/api/users', requireAdmin, async (req, res) => {
  try {
    const { username, password, role, permissions, can_change_password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'اسم المستخدم وكلمة المرور مطلوبان' });
    }
    const existing = await getDb("SELECT id FROM users WHERE username = ?", [username]);
    if (existing) {
      return res.status(400).json({ error: 'اسم المستخدم موجود بالفعل' });
    }
    const hash = await bcrypt.hash(password, 10);
    const perms = role === 'admin' ? '{}' : JSON.stringify(permissions || DEFAULT_PERMISSIONS);
    await runDb(
      "INSERT INTO users (username, password_hash, role, permissions, can_change_password, created_by) VALUES (?, ?, ?, ?, ?, ?)",
      [username, hash, role || 'user', perms, can_change_password ?? 1, req.user?.username || 'system']
    );
    const newUser = await getDb("SELECT id, username, role FROM users WHERE username = ?", [username]);
    const newId = newUser ? Number(newUser.id) : 0;
    logActivity('create', 'user', String(newId), `تم إنشاء مستخدم ${username}`);
    res.status(201).json({ id: newId, username, role: role || 'user' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/api/users/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const user = await getDb("SELECT * FROM users WHERE id = ?", [id]);
    if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });

    const { username, password, role, permissions, can_change_password } = req.body;
    const updates = [];
    const params = [];

    if (username && username !== user.username) {
      updates.push("username = ?");
      params.push(username);
    }
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      updates.push("password_hash = ?");
      params.push(hash);
    }
    if (role && role !== user.role) {
      updates.push("role = ?");
      params.push(role);
    }
    if (permissions) {
      const targetRole = role || user.role;
      updates.push("permissions = ?");
      params.push(targetRole === 'admin' ? '{}' : JSON.stringify(permissions));
    }
    if (can_change_password !== undefined) {
      updates.push("can_change_password = ?");
      params.push(can_change_password ? 1 : 0);
    }

    if (updates.length === 0) return res.json({ message: 'لا تغييرات' });

    params.push(id);
    await runDb(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`, params);
    logActivity('update', 'user', id, `تم تعديل بيانات المستخدم ${username || user.username}`);
    res.json({ message: 'تم التحديث' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/api/users/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const user = await getDb("SELECT username FROM users WHERE id = ?", [id]);
    if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });
    if (String(id) === '1') return res.status(400).json({ error: 'لا يمكن حذف المستخدم الأساسي' });
    await runDb("DELETE FROM users WHERE id = ?", [id]);
    logActivity('delete', 'user', id, `تم حذف المستخدم ${user.username}`);
    res.json({ message: 'تم الحذف' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
