import express from 'express';
import {
  getProductsIntelligence,
  getProductById,
  updateProduct,
} from '../controllers/productController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/intelligence', getProductsIntelligence);
router.get('/:id', getProductById);
router.put('/:id', updateProduct);

export default router;
