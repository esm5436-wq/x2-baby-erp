import app from '../server/app.js';

export default async function handler(req, res) {
  try {
    await app(req, res);
  } catch (err) {
    console.error('Handler error:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
}
