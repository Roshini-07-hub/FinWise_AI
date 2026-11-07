import express from 'express';
import { getBudgets, setBudget, deleteBudget } from '../controllers/budgetController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/overview', getBudgets);
router.post('/', setBudget);
router.delete('/:id', deleteBudget);

export default router;
