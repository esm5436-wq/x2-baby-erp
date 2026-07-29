import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { allDb } from '../db.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-dev-secret';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

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

router.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const token = jwt.sign({ username, role: 'admin' }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, username });
});

router.get('/api/auth/verify', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.json({ valid: false });
  }

  try {
    jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
    res.json({ valid: true });
  } catch {
    res.json({ valid: false });
  }
});

export default router;
