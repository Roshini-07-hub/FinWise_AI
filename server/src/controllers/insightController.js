import AiInsight from '../models/AiInsight.js';
import { getDashboardSummary } from '../services/financialAnalyticsService.js';
import { getPurchaseIntelligence } from '../services/purchaseIntelligenceService.js';
import { generateFinancialInsights } from '../services/aiService.js';

// @route   GET /api/insights
export const getInsights = async (req, res, next) => {
  try {
    const now = new Date();
    const month = req.query.month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Find non-dismissed insights for user in this month
    let insights = await AiInsight.find({
      userId: req.user._id,
      month,
      isDismissed: false,
    }).sort({ createdAt: -1 }).lean();

    // If none exist yet, automatically generate fresh insights from verified DB numbers
    if (insights.length === 0) {
      const summary = await getDashboardSummary(req.user._id, month);
      const purchaseIntel = await getPurchaseIntelligence(req.user._id, 'this-month');

      const generated = await generateFinancialInsights({
        month,
        totalIncome: summary.summaryCards.totalIncome,
        totalExpense: summary.summaryCards.totalExpenses,
        netSavings: summary.summaryCards.savings,
        budget: summary.budget,
        categorySpending: summary.categoryBreakdown,
        frequentProducts: purchaseIntel.frequentProducts,
        previousMonthComparison: summary.summaryCards.comparisonWithPreviousMonth,
      });

      const docsToInsert = generated.map(g => ({
        userId: req.user._id,
        month,
        type: g.type,
        title: g.title,
        message: g.message,
        category: g.category || 'General',
        impactLevel: g.impactLevel || 'medium',
        savingsPotential: g.savingsPotential || 0,
      }));

      if (docsToInsert.length > 0) {
        insights = await AiInsight.insertMany(docsToInsert);
      }
    }

    res.json({ success: true, data: insights });
  } catch (err) {
    next(err);
  }
};

// @route   POST /api/insights/refresh
export const refreshInsights = async (req, res, next) => {
  try {
    const now = new Date();
    const month = req.body.month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Remove old insights for this month to re-generate
    await AiInsight.deleteMany({ userId: req.user._id, month });

    const summary = await getDashboardSummary(req.user._id, month);
    const purchaseIntel = await getPurchaseIntelligence(req.user._id, 'this-month');

    const generated = await generateFinancialInsights({
      month,
      totalIncome: summary.summaryCards.totalIncome,
      totalExpense: summary.summaryCards.totalExpenses,
      netSavings: summary.summaryCards.savings,
      budget: summary.budget,
      categorySpending: summary.categoryBreakdown,
      frequentProducts: purchaseIntel.frequentProducts,
      previousMonthComparison: summary.summaryCards.comparisonWithPreviousMonth,
    });

    const docs = await AiInsight.insertMany(
      generated.map(g => ({
        userId: req.user._id,
        month,
        type: g.type,
        title: g.title,
        message: g.message,
        category: g.category || 'General',
        impactLevel: g.impactLevel || 'medium',
        savingsPotential: g.savingsPotential || 0,
      }))
    );

    res.json({ success: true, data: docs, message: 'AI insights refreshed based on latest records.' });
  } catch (err) {
    next(err);
  }
};

// @route   PUT /api/insights/:id/dismiss
export const dismissInsight = async (req, res, next) => {
  try {
    const insight = await AiInsight.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { isDismissed: true },
      { new: true }
    );

    if (!insight) {
      return res.status(404).json({ success: false, message: 'Insight not found.' });
    }

    res.json({ success: true, message: 'Insight dismissed.' });
  } catch (err) {
    next(err);
  }
};
