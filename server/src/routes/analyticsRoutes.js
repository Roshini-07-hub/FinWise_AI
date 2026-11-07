import express from 'express';
import { getDashboard, getAnalytics, exportCsv } from '../controllers/analyticsController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/dashboard', getDashboard);
router.get('/charts', getAnalytics);
router.get('/export-csv', exportCsv);

export default router;
