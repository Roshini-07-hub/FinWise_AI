import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Please provide a transaction title'],
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, 'Please provide an amount'],
      min: [0.01, 'Amount must be greater than zero'],
    },
    type: {
      type: String,
      enum: ['income', 'expense'],
      required: true,
      default: 'expense',
      index: true,
    },
    category: {
      type: String,
      required: [true, 'Please specify a category'],
      trim: true,
      index: true,
    },
    date: {
      type: Date,
      default: Date.now,
      index: true,
    },
    paymentMethod: {
      type: String,
      default: 'UPI / GPay / PhonePe / Paytm',
    },
    merchant: {
      type: String,
      trim: true,
      default: '',
    },
    notes: {
      type: String,
      default: '',
    },
    receiptId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Receipt',
      default: null,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    isRecurring: {
      type: Boolean,
      default: false,
    },
    categorizationMethod: {
      type: String,
      enum: ['manual', 'ai', 'rule'],
      default: 'manual',
    },
    confidenceScore: {
      type: Number,
      default: 1.0,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for user query filtering and date sorting
transactionSchema.index({ userId: 1, date: -1 });
transactionSchema.index({ userId: 1, category: 1 });
transactionSchema.index({ userId: 1, type: 1 });

export default mongoose.model('Transaction', transactionSchema);
