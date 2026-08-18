import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getDb, allDb, runDb } from '../db.js';
import { ADMIN_PERMISSIONS, parsePermissions } from '../middleware/Permission.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-dev-secret';

router.get('/api/public/manifest', async (req, res) => {
  try {
    let iconSrc = '/icon.svg';
    let iconType = 'image/svg+xml';
    const rows = await allDb("SELECT value FROM settings WHERE key = 'brandLogo' LIMIT 1");
    if (rows.length > 0 && rows[0].value) {
      iconSrc = '/api/public/brand-icon';
      iconType = 'image/png';
    }
    const brandRows = await allDb("SELECT key, value FROM settings WHERE key IN ('brandName')");
    let name = 'X2 ERP';
    let shortName = 'X2 ERP';
    brandRows.forEach(r => {
      if (r.key === 'brandName' && r.value) { name = r.value; shortName = r.value; }
    });
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-cache');
    res.json({
      name,
      short_name: shortName,
      description: 'نظام إدارة المخزون والمبيعات',
      start_url: '/',
      display: 'standalone',
      orientation: 'any',
      background_color: '#f8fafc',
      theme_color: '#006B5E',
      dir: 'rtl',
      lang: 'ar',
      categories: ['business', 'productivity'],
      icons: [
        { src: iconSrc, sizes: 'any', type: iconType, purpose: 'any' }
      ]
    });
  } catch {
    res.json({
      name: 'X2 ERP', short_name: 'X2 ERP',
      description: 'نظام إدارة المخزون والمبيعات',
      start_url: '/', display: 'standalone', orientation: 'any',
      background_color: '#f8fafc', theme_color: '#006B5E',
      dir: 'rtl', lang: 'ar', categories: ['business', 'productivity'],
      icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }]
    });
  }
});

router.get('/api/public/brand', async (req, res) => {
  try {
    const rows = await allDb("SELECT key, value FROM settings WHERE key IN ('brandLogo', 'brandName', 'brandSlogan', 'brandSloganDesign')");
    const brand = {};
    rows.forEach(row => { brand[row.key] = row.value; });
    res.json(brand);
  } catch {
    res.json({ brandName: 'X2 BABY' });
  }
});

router.get('/api/public/brand-icon', async (req, res) => {
  try {
    const rows = await allDb("SELECT value FROM settings WHERE key = 'brandLogo' LIMIT 1");
    if (rows.length > 0 && rows[0].value) {
      const dataUrl = rows[0].value;
      const match = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
      if (match) {
        const mimeType = match[1];
        const buffer = Buffer.from(match[2], 'base64');
        res.setHeader('Content-Type', mimeType);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.send(buffer);
      }
    }
    res.status(404).json({ error: 'No brand icon' });
  } catch {
    res.status(404).json({ error: 'No brand icon' });
  }
});

router.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'اسم المستخدم وكلمة المرور مطلوبان' });
  }

  try {
    const user = await getDb("SELECT * FROM users WHERE username = ?", [username]);
    if (!user) {
      return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
    }
    const valid = await bcrypt.compare(password, user.password_hash || '');
    if (!valid) {
      return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
    }

    const permissions = user.role === 'admin' ? ADMIN_PERMISSIONS : parsePermissions(user.permissions);
    const token = jwt.sign(
      { userId: Number(user.id), username: user.username, role: user.role, permissions },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    try {
      await runDb("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?", [user.id]);
    } catch (e) {
      console.error('Failed to update last_login:', e.message);
    }

    res.json({ token, username: user.username, role: user.role, permissions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/api/auth/verify', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.json({ valid: false });
  }

  try {
    const payload = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
    // دعم الرموز القديمة التي لا تحمل userId
    const user = payload.userId
      ? await getDb("SELECT id, username, role, permissions, can_change_password FROM users WHERE id = ?", [payload.userId])
      : await getDb("SELECT id, username, role, permissions, can_change_password FROM users WHERE username = ?", [payload.username]);
    if (!user) {
      return res.json({ valid: false });
    }
    const permissions = user.role === 'admin' ? ADMIN_PERMISSIONS : parsePermissions(user.permissions);
    res.json({
      valid: true,
      user: {
        id: Number(user.id),
        username: user.username,
        role: user.role,
        permissions,
        can_change_password: !!user.can_change_password,
      },
    });
  } catch {
    res.json({ valid: false });
  }
});

export default router;
