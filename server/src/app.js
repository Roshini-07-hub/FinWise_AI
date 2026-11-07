import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/authRoutes.js';
import transactionRoutes from './routes/transactionRoutes.js';
import budgetRoutes from './routes/budgetRoutes.js';
import receiptRoutes from './routes/receiptRoutes.js';
import productRoutes from './routes/productRoutes.js';
import insightRoutes from './routes/insightRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import purchaseAssistantRoutes from './routes/purchaseAssistantRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS setup
app.use(cors({
  origin: true,
  credentials: true,
}));

// HTTP Request logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Request Body Parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static uploads directory
const uploadsPath = path.join(process.cwd(), 'uploads');
app.use('/uploads', express.static(uploadsPath));

// Rate Limiter for API endpoints
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per 15 mins
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests from this IP, please try again later.' },
});
app.use('/api', limiter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'FinWise AI Platform Backend',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/receipts', receiptRoutes);
app.use('/api/products', productRoutes);
app.use('/api/insights', insightRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/purchase-assistant', purchaseAssistantRoutes);

// Global Error Handler
app.use(errorHandler);

export default app;
