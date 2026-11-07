import express from 'express';
import {
  uploadAndOcrReceipt,
  confirmReceipt,
  getReceipts,
  getReceiptById,
  deleteReceipt,
  clearAllReceipts,
} from '../controllers/receiptController.js';
import { protect } from '../middleware/auth.js';
import { uploadReceipt } from '../middleware/upload.js';

const router = express.Router();

router.use(protect);

router.post('/upload', uploadReceipt.single('receipt'), uploadAndOcrReceipt);
router.delete('/clear-all', clearAllReceipts);
router.post('/:id/confirm', confirmReceipt);
router.get('/', getReceipts);
router.get('/:id', getReceiptById);
router.delete('/:id', deleteReceipt);

export default router;
