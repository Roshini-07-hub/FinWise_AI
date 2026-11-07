import mongoose from 'mongoose';
import ChatMessage from '../models/ChatMessage.js';
import Transaction from '../models/Transaction.js';
import Product from '../models/Product.js';
import { getDashboardSummary } from '../services/financialAnalyticsService.js';
import { getBudgetOverview } from '../services/budgetService.js';
import { answerFinancialQuery } from '../services/aiService.js';
import { searchSemanticTransactions } from '../services/vectorService.js';

// @route   POST /api/chat/message
export const sendMessage = async (req, res, next) => {
  try {
    const { question, sessionId = 'default-session' } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({ success: false, message: 'Please provide a message or question.' });
    }

    const cleanQuestion = question.trim();
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // 1. Save user question message
    await ChatMessage.create({
      userId: req.user._id,
      sessionId,
      role: 'user',
      content: cleanQuestion,
    });

    // 2. Compute exact financial figures from verified database records (Strict requirement: AI must NOT invent numbers)
    const dashboardSummary = await getDashboardSummary(req.user._id, currentMonth);
    const budgetOverview = await getBudgetOverview(req.user._id, currentMonth);

    // 3. Check for specific merchant/keyword mentions or vector matches
    const vectorMatches = await searchSemanticTransactions({
      userId: req.user._id,
      queryText: cleanQuestion,
      limit: 5,
    });

    const specificTxIds = vectorMatches.map(v => v.transactionId).filter(Boolean);
    let matchedTransactions = [];
    if (specificTxIds.length > 0) {
      matchedTransactions = await Transaction.find({
        _id: { $in: specificTxIds },
        userId: req.user._id,
      }).select('title amount category date merchant').lean();
    }

    // 4. Check for top products
    const topProducts = await Product.find({ userId: req.user._id })
      .sort({ totalPurchasesCount: -1 })
      .limit(5)
      .select('name totalPurchasesCount totalAmountSpent averageUnitPrice')
      .lean();

    // 5. Structure ground-truth financial context
    const financialSummary = {
      month: currentMonth,
      totalIncome: dashboardSummary.summaryCards.totalIncome,
      totalExpenses: dashboardSummary.summaryCards.totalExpenses,
      netBalance: dashboardSummary.summaryCards.savings,
      monthlyBudget: budgetOverview.overall.budget,
      remainingBudget: budgetOverview.overall.remaining,
      budgetUsedPercentage: budgetOverview.overall.percentage,
      topCategory: dashboardSummary.categoryBreakdown[0]?.category || 'None',
      topCategoryAmount: dashboardSummary.categoryBreakdown[0]?.total || 0,
      categoryBreakdown: dashboardSummary.categoryBreakdown.slice(0, 5),
      topProducts,
      queryMatches: matchedTransactions,
    };

    // 6. Fetch recent chat history
    const history = await ChatMessage.find({ userId: req.user._id, sessionId })
      .sort({ createdAt: -1 })
      .limit(6)
      .lean();
    history.reverse();

    // 7. Get AI explanation based strictly on calculated financial ground truth
    const answer = await answerFinancialQuery({
      question: cleanQuestion,
      financialSummary,
      chatHistory: history,
    });

    // 8. Save assistant answer
    const assistantMessage = await ChatMessage.create({
      userId: req.user._id,
      sessionId,
      role: 'assistant',
      content: answer,
      financialContext: {
        totalIncome: financialSummary.totalIncome,
        totalExpenses: financialSummary.totalExpenses,
        remainingBudget: financialSummary.remainingBudget,
      },
    });

    res.json({
      success: true,
      data: assistantMessage,
    });
  } catch (err) {
    next(err);
  }
};

// @route   GET /api/chat/history
export const getChatHistory = async (req, res, next) => {
  try {
    const { sessionId = 'default-session' } = req.query;
    const messages = await ChatMessage.find({ userId: req.user._id, sessionId })
      .sort({ createdAt: 1 })
      .limit(50)
      .lean();

    res.json({ success: true, data: messages });
  } catch (err) {
    next(err);
  }
};

// @route   DELETE /api/chat/clear
export const clearChatHistory = async (req, res, next) => {
  try {
    const { sessionId = 'default-session' } = req.query;
    await ChatMessage.deleteMany({ userId: req.user._id, sessionId });
    res.json({ success: true, message: 'Chat history cleared successfully.' });
  } catch (err) {
    next(err);
  }
};
