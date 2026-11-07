import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // The canonical, normalized name (e.g., "Amul Taaza Toned Milk 500ml")
    name: {
      type: String,
      required: true,
      trim: true,
    },
    // Normalized root without minor variant tokens for grouping (e.g. "amul taaza milk")
    normalizedKey: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    brand: {
      type: String,
      trim: true,
      default: '',
    },
    sizeOrVariant: {
      type: String,
      trim: true,
      default: '',
    },
    category: {
      type: String,
      default: 'Groceries',
      trim: true,
      index: true,
    },
    subcategory: {
      type: String,
      default: 'General',
      trim: true,
    },
    // Known receipt aliases that map to this canonical product
    aliases: [
      {
        type: String,
        trim: true,
      },
    ],
    // Aggregated statistics for instant retrieval
    totalPurchasesCount: {
      type: Number,
      default: 0,
    },
    totalQuantityPurchased: {
      type: Number,
      default: 0,
    },
    totalAmountSpent: {
      type: Number,
      default: 0,
    },
    averageUnitPrice: {
      type: Number,
      default: 0,
    },
    lastUnitPrice: {
      type: Number,
      default: 0,
    },
    lastPurchasedAt: {
      type: Date,
      default: Date.now,
    },
    lastMerchant: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

productSchema.index({ userId: 1, normalizedKey: 1 });
productSchema.index({ userId: 1, totalPurchasesCount: -1 });

export default mongoose.model('Product', productSchema);
