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
