export default function handler(req, res) {
  res.status(200).json({ status: 'ok', env: { VERCEL: process.env.VERCEL, hasTursoUrl: !!process.env.TURSO_DATABASE_URL, ADMIN_USERNAME: !!process.env.ADMIN_USERNAME } });
}
