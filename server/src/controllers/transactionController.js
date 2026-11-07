import mongoose from 'mongoose';
import Transaction from '../models/Transaction.js';
import Receipt from '../models/Receipt.js';
import ReceiptItem from '../models/ReceiptItem.js';
import Product from '../models/Product.js';
import ProductPurchase from '../models/ProductPurchase.js';
import AiInsight from '../models/AiInsight.js';
import ChatMessage from '../models/ChatMessage.js';
import { categorizeTransaction } from '../services/aiService.js';
import { indexTransactionEmbedding, searchSemanticTransactions } from '../services/vectorService.js';
import { recordTransactionProduct } from '../services/purchaseIntelligenceService.js';

// @route   GET /api/transactions
export const getTransactions = async (req, res, next) => {
  try {
    const {
      search,
      category,
      type,
      paymentMethod,
      startDate,
      endDate,
      sort = 'newest',
      page = 1,
      limit = 15,
      semantic = false,
    } = req.query;

    const query = { userId: req.user._id };

    // Standard filters
    if (category && category !== 'all') {
      query.category = category;
    }
    if (type && type !== 'all') {
      query.type = type;
    }
    if (paymentMethod && paymentMethod !== 'all') {
      query.paymentMethod = paymentMethod;
    }
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    // Search query
    if (search && search.trim()) {
      if (semantic === 'true') {
        // Use vector search
        const vectorMatches = await searchSemanticTransactions({
          userId: req.user._id,
          queryText: search.trim(),
          limit: 20
        });
        const matchedIds = vectorMatches.map(v => v.transactionId).filter(Boolean);
        if (matchedIds.length > 0) {
          query._id = { $in: matchedIds };
        } else {
          query.$or = [
            { title: { $regex: search.trim(), $options: 'i' } },
            { merchant: { $regex: search.trim(), $options: 'i' } },
            { notes: { $regex: search.trim(), $options: 'i' } }
          ];
        }
      } else {
        query.$or = [
          { title: { $regex: search.trim(), $options: 'i' } },
          { merchant: { $regex: search.trim(), $options: 'i' } },
          { notes: { $regex: search.trim(), $options: 'i' } }
        ];
      }
    }

    // Sorting: default to createdAt: -1 to ensure newly created transactions show up immediately
    let sortOptions = { createdAt: -1, date: -1 };
    if (sort === 'oldest') sortOptions = { date: 1, createdAt: 1 };
    else if (sort === 'highest') sortOptions = { amount: -1, createdAt: -1 };
    else if (sort === 'lowest') sortOptions = { amount: 1, createdAt: -1 };

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [transactions, totalCount] = await Promise.all([
      Transaction.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .populate('receiptId', 'originalName fileUrl')
        .lean(),
      Transaction.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: transactions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        pages: Math.ceil(totalCount / limitNum),
      },
    });
  } catch (err) {
    next(err);
  }
};

// @route   POST /api/transactions
export const createTransaction = async (req, res, next) => {
  try {
    const {
      title,
      amount,
      type = 'expense',
      category,
      date = new Date(),
      paymentMethod = 'UPI / GPay / PhonePe / Paytm',
      merchant = '',
      notes = '',
      receiptId = null,
      tags = [],
    } = req.body;

    if (!title || !amount) {
      return res.status(400).json({ success: false, message: 'Please provide title and amount.' });
    }

    let resolvedCategory = category;
    let confidenceScore = 1.0;
    let categorizationMethod = 'manual';

    // Auto-categorize if user didn't specify or left as default
    if (!category || category === 'Uncategorized') {
      const aiResult = await categorizeTransaction({ title, amount, merchant, notes });
      resolvedCategory = aiResult.category;
      confidenceScore = aiResult.confidence;
      categorizationMethod = aiResult.method;
    }

    const transaction = await Transaction.create({
      userId: req.user._id,
      title: title.trim(),
      amount: Number(amount),
      type,
      category: resolvedCategory,
      date: new Date(date),
      paymentMethod,
      merchant: merchant.trim(),
      notes: notes.trim(),
      receiptId: receiptId || null,
      tags,
      categorizationMethod,
      confidenceScore,
    });

    // Asynchronously index in ChromaDB for vector retrieval
    indexTransactionEmbedding({
      userId: req.user._id,
      transactionId: transaction._id,
      title: transaction.title,
      merchant: transaction.merchant,
      category: transaction.category,
      notes: transaction.notes,
      amount: transaction.amount,
      date: transaction.date,
    }).catch(err => console.error('Chroma tx index error:', err.message));

    // Record as product purchase if expense
    if (transaction.type === 'expense') {
      recordTransactionProduct({
        userId: req.user._id,
        transactionId: transaction._id,
        title: transaction.title,
        amount: transaction.amount,
        category: transaction.category,
        merchant: transaction.merchant,
        date: transaction.date,
      }).catch(err => console.warn('Record product error:', err.message));
    }

    res.status(201).json({
      success: true,
      data: transaction,
    });
  } catch (err) {
    next(err);
  }
};

// @route   GET /api/transactions/:id
export const getTransactionById = async (req, res, next) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      userId: req.user._id,
    }).populate('receiptId');

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found.' });
    }

    res.json({ success: true, data: transaction });
  } catch (err) {
    next(err);
  }
};

// @route   PUT /api/transactions/:id
export const updateTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found.' });
    }

    const updatableFields = [
      'title',
      'amount',
      'type',
      'category',
      'date',
      'paymentMethod',
      'merchant',
      'notes',
      'receiptId',
      'tags',
    ];

    for (const field of updatableFields) {
      if (req.body[field] !== undefined) {
        transaction[field] = req.body[field];
      }
    }

    await transaction.save();

    // Re-index in Chroma
    indexTransactionEmbedding({
      userId: req.user._id,
      transactionId: transaction._id,
      title: transaction.title,
      merchant: transaction.merchant,
      category: transaction.category,
      notes: transaction.notes,
      amount: transaction.amount,
      date: transaction.date,
    }).catch(e => console.error(e));

    res.json({ success: true, data: transaction });
  } catch (err) {
    next(err);
  }
};

// @route   DELETE /api/transactions/:id
export const deleteTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found.' });
    }

    // Clean up associated product purchases & update counts
    const purchases = await ProductPurchase.find({ transactionId: req.params.id });
    for (const p of purchases) {
      const prod = await Product.findById(p.productId);
      if (prod) {
        prod.totalPurchasesCount = Math.max(0, prod.totalPurchasesCount - 1);
        prod.totalQuantityPurchased = Math.max(0, prod.totalQuantityPurchased - p.quantity);
        prod.totalAmountSpent = Math.max(0, prod.totalAmountSpent - p.totalPrice);
        if (prod.totalPurchasesCount <= 0) {
          await Product.deleteOne({ _id: prod._id });
        } else {
          prod.averageUnitPrice = Number((prod.totalAmountSpent / Math.max(1, prod.totalQuantityPurchased)).toFixed(2));
          await prod.save();
        }
      }
    }
    await ProductPurchase.deleteMany({ transactionId: req.params.id });

    res.json({ success: true, message: 'Transaction deleted successfully.' });
  } catch (err) {
    next(err);
  }
};

// @route   POST /api/transactions/auto-categorize
export const autoCategorize = async (req, res, next) => {
  try {
    const { title, amount, merchant, notes } = req.body;
    const result = await categorizeTransaction({ title, amount, merchant, notes });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

// @route   DELETE /api/transactions/clear-all
export const clearAllHistory = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const [txResult, receiptResult, prodResult] = await Promise.all([
      Transaction.deleteMany({ userId }),
      Receipt.deleteMany({ userId }),
      ReceiptItem.deleteMany({ userId }),
      Product.deleteMany({ userId }),
      ProductPurchase.deleteMany({ userId }),
      AiInsight.deleteMany({ userId }),
      ChatMessage.deleteMany({ userId }),
    ]);

    res.json({
      success: true,
      message: 'All previous transaction history, receipts, and products have been cleared.',
      deletedCount: txResult.deletedCount,
    });
  } catch (err) {
    next(err);
  }
};
