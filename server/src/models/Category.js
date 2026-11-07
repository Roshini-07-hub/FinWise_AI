import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null, // null means global predefined system category
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    icon: {
      type: String,
      default: 'Tag',
    },
    color: {
      type: String,
      default: '#6366f1',
    },
    type: {
      type: String,
      enum: ['expense', 'income'],
      default: 'expense',
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

categorySchema.index({ userId: 1, name: 1 }, { unique: false });

export default mongoose.model('Category', categorySchema);
