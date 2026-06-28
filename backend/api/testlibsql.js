import { createClient } from '@libsql/client';

export default async function handler(req, res) {
  try {
    const client = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    const result = await client.execute("SELECT 1 as test");
    res.status(200).json({ libsql: 'ok', rows: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack?.split('\n').slice(0, 3).join('\n') });
  }
}
