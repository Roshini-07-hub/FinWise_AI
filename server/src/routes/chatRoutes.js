import express from 'express';
import { sendMessage, getChatHistory, clearChatHistory } from '../controllers/chatController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.post('/message', sendMessage);
router.get('/history', getChatHistory);
router.delete('/clear', clearChatHistory);

export default router;
