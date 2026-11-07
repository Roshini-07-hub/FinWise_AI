import PurchaseEvaluation from '../models/PurchaseEvaluation.js';
import {
  fetchUserFinancialContext,
  calculateAffordability,
  generateAIExplanation,
  buildSavingsPlan,
} from '../services/purchaseAssistantService.js';

// @route   POST /api/purchase-assistant/analyze
export const analyzePurchase = async (req, res, next) => {
  try {
    const {
      productName,
      price,
      category = 'Shopping',
      purchasePriority = 'Important',
      paymentMethod = 'UPI',
      emiDetails = {},
      notes = '',
      month,
    } = req.body;

    if (!productName || !price || Number(price) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid product name and positive price.',
      });
    }

    const userId = req.user._id;

    // 1. Fetch live authenticated financial context from MongoDB
    const financialContext = await fetchUserFinancialContext(userId, month);

    // 2. Perform deterministic verified financial calculation
    const calc = calculateAffordability({
      price,
      category,
      purchasePriority,
      paymentMethod,
      emiDetails,
      financialContext,
    });

    // 3. Generate AI Explanation using Groq (or fallback)
    const aiExplanation = await generateAIExplanation({
      productName,
      price: Number(price),
      category,
      purchasePriority,
      paymentMethod,
      decision: calc.decision,
      affordabilityScore: calc.affordabilityScore,
      financialSnapshot: calc.financialSnapshot,
    });

    // 4. Build AI savings plan
    const savingsPlan = buildSavingsPlan({
      price: Number(price),
      currentSavings: calc.financialSnapshot.currentNetSavings,
      monthlyIncome: calc.financialSnapshot.currentMonthlyIncome,
      monthlyExpenses: calc.financialSnapshot.currentMonthlyExpenses,
    });

    // 5. Store evaluation record in MongoDB Atlas
    const evaluation = await PurchaseEvaluation.create({
      userId,
      productName: productName.trim(),
      price: Number(price),
      category,
      purchasePriority,
      paymentMethod,
      emiDetails,
      notes: notes.trim(),
      decision: calc.decision,
      affordabilityScore: calc.affordabilityScore,
      aiExplanation,
      financialSnapshot: calc.financialSnapshot,
      savingsPlan,
      evaluationDate: new Date(),
    });

    res.status(201).json({
      success: true,
      message: 'Purchase evaluated successfully.',
      data: evaluation,
    });
  } catch (err) {
    next(err);
  }
};

// @route   POST /api/purchase-assistant/savings-plan
export const recalculateSavingsPlan = async (req, res, next) => {
  try {
    const { price, customMonthlySavings } = req.body;
    if (!price || Number(price) <= 0) {
      return res.status(400).json({ success: false, message: 'Valid target price is required.' });
    }

    const userId = req.user._id;
    const context = await fetchUserFinancialContext(userId);

    const plan = buildSavingsPlan({
      price: Number(price),
      currentSavings: context.currentNetSavings,
      monthlyIncome: context.currentMonthlyIncome,
      monthlyExpenses: context.currentMonthlyExpenses,
      customMonthlySavings: Number(customMonthlySavings),
    });

    res.json({
      success: true,
      data: plan,
    });
  } catch (err) {
    next(err);
  }
};

// @route   GET /api/purchase-assistant/history
export const getEvaluationHistory = async (req, res, next) => {
  try {
    const evaluations = await PurchaseEvaluation.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    res.json({
      success: true,
      data: evaluations,
    });
  } catch (err) {
    next(err);
  }
};

// @route   GET /api/purchase-assistant/history/:id
export const getEvaluationById = async (req, res, next) => {
  try {
    const evaluation = await PurchaseEvaluation.findOne({
      _id: req.params.id,
      userId: req.user._id,
    }).lean();

    if (!evaluation) {
      return res.status(404).json({ success: false, message: 'Evaluation record not found.' });
    }

    res.json({
      success: true,
      data: evaluation,
    });
  } catch (err) {
    next(err);
  }
};

// @route   DELETE /api/purchase-assistant/history/:id
export const deleteEvaluation = async (req, res, next) => {
  try {
    const evaluation = await PurchaseEvaluation.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!evaluation) {
      return res.status(404).json({ success: false, message: 'Evaluation record not found.' });
    }

    res.json({
      success: true,
      message: 'Evaluation record deleted successfully.',
    });
  } catch (err) {
    next(err);
  }
};
