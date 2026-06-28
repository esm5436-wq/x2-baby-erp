import express from 'express';
const app = express();
app.get('*', (req, res) => res.json({ express: 'ok', url: req.url }));
export default app;
