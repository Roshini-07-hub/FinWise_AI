import path from 'path';
import fs from 'fs';
import Receipt from '../models/Receipt.js';
import ReceiptItem from '../models/ReceiptItem.js';
import Transaction from '../models/Transaction.js';
import ProductPurchase from '../models/ProductPurchase.js';
import { processReceiptFile } from '../services/ocrService.js';
import { recordReceiptProducts } from '../services/purchaseIntelligenceService.js';
import { indexTransactionEmbedding } from '../services/vectorService.js';

// @route   POST /api/receipts/upload
export const uploadAndOcrReceipt = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a receipt file (JPG, PNG, or PDF).' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    const filePath = req.file.path;
    const mimeType = req.file.mimetype;

    // Run OCR + AI extraction
    const { rawText, structuredData } = await processReceiptFile(filePath, mimeType);

    // Save initial pending receipt record
    const receipt = await Receipt.create({
      userId: req.user._id,
      originalName: req.file.originalname,
      fileUrl,
      mimeType,
      fileSize: req.file.size,
      billNumber: structuredData.billNumber,
      merchant: structuredData.merchant,
      purchaseDate: structuredData.purchaseDate ? new Date(structuredData.purchaseDate) : new Date(),
      totalAmount: structuredData.totalAmount,
      subtotal: structuredData.subtotal,
      taxAmount: structuredData.taxAmount,
      discountAmount: structuredData.discountAmount,
      paymentMethod: structuredData.paymentMethod,
      suggestedCategory: structuredData.suggestedCategory,
      status: 'pending_review',
      rawOcrText: rawText,
      lineItemCount: structuredData.items?.length || 0,
    });

    res.status(201).json({
      success: true,
      data: {
        receiptId: receipt._id,
        fileUrl,
        originalName: req.file.originalname,
        extracted: structuredData,
        rawTextPreview: rawText.slice(0, 300),
      },
    });
  } catch (err) {
    next(err);
  }
};

// @route   POST /api/receipts/:id/confirm
// Critical requirement: Do not save without explicit user confirmation!
export const confirmReceipt = async (req, res, next) => {
  try {
    const receipt = await Receipt.findOne({ _id: req.params.id, userId: req.user._id });
    if (!receipt) {
      return res.status(404).json({ success: false, message: 'Receipt not found.' });
    }

    const {
      merchant,
      billNumber,
      purchaseDate,
      totalAmount,
      category = 'Groceries',
      paymentMethod = 'UPI / GPay / PhonePe / Paytm',
      notes = '',
      items = [],
    } = req.body;

    const finalAmount = Number(totalAmount) || receipt.totalAmount;
    const finalDate = purchaseDate ? new Date(purchaseDate) : receipt.purchaseDate;
    const finalMerchant = merchant || receipt.merchant || 'Store';

    // 1. Create confirmed Transaction in MongoDB Atlas
    const transaction = await Transaction.create({
      userId: req.user._id,
      title: `${finalMerchant} Receipt`,
      amount: finalAmount,
      type: 'expense',
      category,
      date: finalDate,
      paymentMethod,
      merchant: finalMerchant,
      notes: notes || `Receipt Bill #${billNumber || receipt.billNumber || 'N/A'}`,
      receiptId: receipt._id,
      categorizationMethod: 'ai',
      confidenceScore: 0.98,
    });

    // 2. Update Receipt status
    receipt.status = 'confirmed';
    receipt.transactionId = transaction._id;
    receipt.merchant = finalMerchant;
    receipt.billNumber = billNumber || receipt.billNumber;
    receipt.totalAmount = finalAmount;
    receipt.purchaseDate = finalDate;
    receipt.paymentMethod = paymentMethod;
    receipt.suggestedCategory = category;
    receipt.lineItemCount = items.length;
    await receipt.save();

    // 3. Save individual receipt items
    const savedReceiptItems = [];
    for (const item of items) {
      const savedItem = await ReceiptItem.create({
        receiptId: receipt._id,
        userId: req.user._id,
        productName: item.productName,
        normalizedName: item.normalizedName || item.productName,
        category,
        quantity: Number(item.quantity) || 1,
        unitPrice: Number(item.unitPrice) || Number(item.totalPrice) || 0,
        totalPrice: Number(item.totalPrice) || 0,
        discount: Number(item.discount) || 0,
      });
      savedReceiptItems.push(savedItem);
    }

    // 4. Update Product Intelligence & ChromaDB embeddings
    if (items.length > 0) {
      recordReceiptProducts({
        userId: req.user._id,
        transactionId: transaction._id,
        receiptId: receipt._id,
        merchant: finalMerchant,
        date: finalDate,
        items,
      }).catch(err => console.error('Product intelligence recording error:', err.message));
    }

    // 5. Index transaction embedding in ChromaDB
    indexTransactionEmbedding({
      userId: req.user._id,
      transactionId: transaction._id,
      title: transaction.title,
      merchant: transaction.merchant,
      category: transaction.category,
      notes: transaction.notes,
      amount: transaction.amount,
      date: transaction.date,
    }).catch(err => console.error(err));

    res.json({
      success: true,
      message: 'Receipt verified and confirmed transaction saved successfully.',
      data: {
        receipt,
        transaction,
        itemsCount: savedReceiptItems.length,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @route   GET /api/receipts
export const getReceipts = async (req, res, next) => {
  try {
    const receipts = await Receipt.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .populate('transactionId', 'title amount category date')
      .lean();

    res.json({ success: true, data: receipts });
  } catch (err) {
    next(err);
  }
};

// @route   GET /api/receipts/:id
export const getReceiptById = async (req, res, next) => {
  try {
    const receipt = await Receipt.findOne({ _id: req.params.id, userId: req.user._id })
      .populate('transactionId')
      .lean();

    if (!receipt) {
      return res.status(404).json({ success: false, message: 'Receipt not found.' });
    }

    const items = await ReceiptItem.find({ receiptId: receipt._id }).lean();

    res.json({
      success: true,
      data: {
        ...receipt,
        items,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @route   DELETE /api/receipts/clear-all
export const clearAllReceipts = async (req, res, next) => {
  try {
    const receipts = await Receipt.find({ userId: req.user._id });
    const receiptIds = receipts.map(r => r._id);
    const transactionIds = receipts.map(r => r.transactionId).filter(Boolean);

    await ReceiptItem.deleteMany({ receiptId: { $in: receiptIds } });
    await ProductPurchase.deleteMany({ receiptId: { $in: receiptIds } });
    if (transactionIds.length > 0) {
      await Transaction.deleteMany({ _id: { $in: transactionIds }, userId: req.user._id });
    }

    // Clean up physical receipt files from disk
    for (const r of receipts) {
      if (r.fileUrl) {
        const filename = path.basename(r.fileUrl);
        const possiblePaths = [
          path.join(process.cwd(), 'uploads', filename),
          path.join(process.cwd(), 'server', 'uploads', filename),
        ];
        for (const p of possiblePaths) {
          if (fs.existsSync(p)) {
            try { fs.unlinkSync(p); } catch (e) {}
          }
        }
      }
    }

    await Receipt.deleteMany({ userId: req.user._id });

    res.json({
      success: true,
      message: 'All receipt history cleared successfully.',
    });
  } catch (err) {
    next(err);
  }
};

// @route   DELETE /api/receipts/:id
export const deleteReceipt = async (req, res, next) => {
  try {
    const receipt = await Receipt.findOne({ _id: req.params.id, userId: req.user._id });
    if (!receipt) {
      return res.status(404).json({ success: false, message: 'Receipt not found.' });
    }

    // 1. Delete associated receipt items
    await ReceiptItem.deleteMany({ receiptId: receipt._id });

    // 2. Delete associated product purchases
    await ProductPurchase.deleteMany({ receiptId: receipt._id });

    // 3. Delete associated transaction if created from this receipt
    if (receipt.transactionId) {
      await Transaction.deleteOne({ _id: receipt.transactionId, userId: req.user._id });
    }

    // 4. Clean up uploaded physical file from disk
    if (receipt.fileUrl) {
      const filename = path.basename(receipt.fileUrl);
      const possiblePaths = [
        path.join(process.cwd(), 'uploads', filename),
        path.join(process.cwd(), 'server', 'uploads', filename),
      ];
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          try { fs.unlinkSync(p); } catch (e) {}
        }
      }
    }

    // 5. Delete receipt record
    await Receipt.deleteOne({ _id: receipt._id });

    res.json({
      success: true,
      message: 'Receipt and all associated records deleted successfully.',
    });
  } catch (err) {
    next(err);
  }
};
