import mongoose from 'mongoose';

const purchaseEvaluationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    productName: {
      type: String,
      required: [true, 'Product name is required.'],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, 'Price is required.'],
      min: [1, 'Price must be greater than 0.'],
    },
    category: {
      type: String,
      default: 'Shopping',
      trim: true,
    },
    purchaseDate: {
      type: Date,
      default: Date.now,
    },
    purchasePriority: {
      type: String,
      enum: ['Essential', 'Important', 'Luxury'],
      default: 'Important',
    },
    paymentMethod: {
      type: String,
      enum: ['Cash', 'UPI', 'Debit Card', 'Credit Card', 'EMI'],
      default: 'UPI',
    },
    emiDetails: {
      isEmi: { type: Boolean, default: false },
      downPayment: { type: Number, default: 0 },
      monthlyInstallment: { type: Number, default: 0 },
      tenureMonths: { type: Number, default: 0 },
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    decision: {
      type: String,
      enum: ['AFFORDABLE', 'AFFORDABLE WITH CAUTION', 'WAIT AND SAVE', 'NOT RECOMMENDED RIGHT NOW'],
      required: true,
    },
    affordabilityScore: {
      type: Number,
      min: 0,
      max: 100,
      required: true,
    },
    aiExplanation: {
      summary: { type: String, default: '' },
      reasons: [{ type: String }],
      risks: [{ type: String }],
      recommendations: [{ type: String }],
      suggestedDate: { type: String, default: '' },
    },
    financialSnapshot: {
      // Current financial position before proposed purchase
      currentMonthlyIncome: { type: Number, default: 0 },
      currentMonthlyExpenses: { type: Number, default: 0 },
      currentRemainingBudget: { type: Number, default: 0 },
      currentNetSavings: { type: Number, default: 0 },
      currentBudgetUtilizationPct: { type: Number, default: 0 },
      totalMonthlyBudget: { type: Number, default: 0 },
      lifetimeBalance: { type: Number, default: 0 },
      categoryBudgetRemaining: { type: Number, default: 0 },
      upcomingRecurringExpenses: { type: Number, default: 0 },

      // Projected financial position after proposed purchase
      projectedMonthlyExpenses: { type: Number, default: 0 },
      projectedRemainingBudget: { type: Number, default: 0 },
      projectedBudgetUtilizationPct: { type: Number, default: 0 },
      projectedNetSavings: { type: Number, default: 0 },
      budgetImpactDifference: { type: Number, default: 0 },
    },
    savingsPlan: {
      targetAmount: { type: Number, default: 0 },
      amountSaved: { type: Number, default: 0 },
      remainingAmount: { type: Number, default: 0 },
      monthlySavingsRecommendation: { type: Number, default: 0 },
      estimatedMonths: { type: Number, default: 0 },
      estimatedCompletionDate: { type: String, default: '' },
      savingsTips: [{ type: String }],
    },
  },
  {
    timestamps: true,
  }
);

purchaseEvaluationSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('PurchaseEvaluation', purchaseEvaluationSchema);
