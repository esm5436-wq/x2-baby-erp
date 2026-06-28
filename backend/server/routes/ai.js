import { Router } from 'express';
import { callGemini } from '../utils/aiClient.js';

const router = Router();

router.post('/api/ai/chat', async (req, res) => {
  const { messages } = req.body;
  const refreshState = { current: false };

  try {
    const result = await callGemini(messages, refreshState);
    return res.json({ content: result.content, refreshRequired: result.refreshRequired });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ error: error.message });
  }
});

export default router;
