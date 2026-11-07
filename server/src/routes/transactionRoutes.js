import express from 'express';
import {
  getTransactions,
  createTransaction,
  getTransactionById,
  updateTransaction,
  deleteTransaction,
  autoCategorize,
  clearAllHistory,
} from '../controllers/transactionController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.delete('/clear-all', clearAllHistory);

router.route('/')
  .get(getTransactions)
  .post(createTransaction);

router.post('/auto-categorize', autoCategorize);

router.route('/:id')
  .get(getTransactionById)
  .put(updateTransaction)
  .delete(deleteTransaction);

export default router;
