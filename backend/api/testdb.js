import { initializeSchema } from '../server/db.js';

export default async function handler(req, res) {
  try {
    await initializeSchema();
    res.status(200).json({ schema: 'ok', env: { url: !!process.env.TURSO_DATABASE_URL, token: !!process.env.TURSO_AUTH_TOKEN } });
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack?.split('\n')[0] });
  }
}
