import express from 'express';
import {
  analyzePurchase,
  recalculateSavingsPlan,
  getEvaluationHistory,
  getEvaluationById,
  deleteEvaluation,
} from '../controllers/purchaseAssistantController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// All purchase assistant routes require valid JWT auth
router.use(protect);

router.post('/analyze', analyzePurchase);
router.post('/savings-plan', recalculateSavingsPlan);
router.get('/history', getEvaluationHistory);
router.get('/history/:id', getEvaluationById);
router.delete('/history/:id', deleteEvaluation);

export default router;
