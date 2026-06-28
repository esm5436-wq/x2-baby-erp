import '../server/middleware/errorHandler.js';
import '../server/middleware/auth.js';
import '../server/routes/auth.js';

export default function handler(req, res) {
  res.json({ ok: true });
}
