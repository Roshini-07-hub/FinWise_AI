import mongoose from 'mongoose';

const aiInsightSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    month: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['warning', 'tip', 'pattern', 'savings', 'achievement'],
      default: 'tip',
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      default: 'General',
    },
    impactLevel: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium',
    },
    savingsPotential: {
      type: Number,
      default: 0,
    },
    isDismissed: {
      type: Boolean,
      default: false,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

aiInsightSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('AiInsight', aiInsightSchema);
