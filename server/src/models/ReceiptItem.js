import mongoose from 'mongoose';

const receiptItemSchema = new mongoose.Schema(
  {
    receiptId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Receipt',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      default: null,
      index: true,
    },
    productName: {
      type: String,
      required: true,
      trim: true,
    },
    normalizedName: {
      type: String,
      trim: true,
      default: '',
    },
    category: {
      type: String,
      default: 'Groceries',
      trim: true,
    },
    quantity: {
      type: Number,
      default: 1,
      min: 0,
    },
    unitPrice: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalPrice: {
      type: Number,
      required: true,
      default: 0,
    },
    discount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

receiptItemSchema.index({ userId: 1, productName: 1 });

export default mongoose.model('ReceiptItem', receiptItemSchema);
