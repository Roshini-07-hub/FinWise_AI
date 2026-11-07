import dotenv from 'dotenv';
dotenv.config();

import { connectDB, disconnectDB } from '../config/db.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import Receipt from '../models/Receipt.js';
import ReceiptItem from '../models/ReceiptItem.js';
import Product from '../models/Product.js';
import ProductPurchase from '../models/ProductPurchase.js';
import AiInsight from '../models/AiInsight.js';
import ChatMessage from '../models/ChatMessage.js';

export const cleanAllHistory = async () => {
  try {
    console.log('🧹 Clearing all previous transactions and history...');

    await Promise.all([
      Transaction.deleteMany({}),
      Receipt.deleteMany({}),
      ReceiptItem.deleteMany({}),
      Product.deleteMany({}),
      ProductPurchase.deleteMany({}),
      AiInsight.deleteMany({}),
      ChatMessage.deleteMany({}),
    ]);

    console.log('✅ All previous transaction history, receipts, products, and insights have been completely cleared!');
  } catch (err) {
    console.error('Error clearing history:', err);
  }
};

if (process.argv[1]?.endsWith('cleanAllHistory.js')) {
  (async () => {
    await connectDB();
    await cleanAllHistory();
    await disconnectDB();
    process.exit(0);
  })();
}
