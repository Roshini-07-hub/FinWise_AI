import mongoose from 'mongoose';

const budgetSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // month formatted as 'YYYY-MM' (e.g. '2026-11')
    month: {
      type: String,
      required: true,
      match: [/^\d{4}-(0[1-9]|1[0-2])$/, 'Month must be in YYYY-MM format'],
      index: true,
    },
    // category name (e.g. 'Food & Dining') or 'TOTAL' for overall monthly budget
    category: {
      type: String,
      required: true,
      default: 'TOTAL',
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, 'Please provide budget amount'],
      min: [1, 'Budget amount must be positive'],
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

budgetSchema.index({ userId: 1, month: 1, category: 1 }, { unique: true });

export default mongoose.model('Budget', budgetSchema);
