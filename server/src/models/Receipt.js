import mongoose from 'mongoose';

const receiptSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    billNumber: {
      type: String,
      trim: true,
      default: '',
    },
    merchant: {
      type: String,
      trim: true,
      default: '',
    },
    purchaseDate: {
      type: Date,
      default: Date.now,
    },
    totalAmount: {
      type: Number,
      default: 0,
    },
    subtotal: {
      type: Number,
      default: 0,
    },
    taxAmount: {
      type: Number,
      default: 0,
    },
    discountAmount: {
      type: Number,
      default: 0,
    },
    paymentMethod: {
      type: String,
      default: '',
    },
    suggestedCategory: {
      type: String,
      default: 'Groceries',
    },
    status: {
      type: String,
      enum: ['pending_review', 'confirmed', 'rejected'],
      default: 'pending_review',
      index: true,
    },
    rawOcrText: {
      type: String,
      default: '',
    },
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
      default: null,
    },
    lineItemCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

receiptSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('Receipt', receiptSchema);
