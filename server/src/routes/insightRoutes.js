import express from 'express';
import { getInsights, refreshInsights, dismissInsight } from '../controllers/insightController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/', getInsights);
router.post('/refresh', refreshInsights);
router.put('/:id/dismiss', dismissInsight);

export default router;
