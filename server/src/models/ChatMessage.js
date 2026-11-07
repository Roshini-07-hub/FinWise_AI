import mongoose from 'mongoose';

const chatMessageSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    financialContext: {
      type: mongoose.Schema.Types.Mixed,
      default: null, // Aggregated metrics or source facts
    },
    suggestedActions: [
      {
        label: String,
        actionType: String,
        target: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

chatMessageSchema.index({ userId: 1, sessionId: 1, createdAt: 1 });

export default mongoose.model('ChatMessage', chatMessageSchema);
