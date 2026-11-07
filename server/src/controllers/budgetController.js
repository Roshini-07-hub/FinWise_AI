import Budget from '../models/Budget.js';
import User from '../models/User.js';
import { getBudgetOverview } from '../services/budgetService.js';

// @route   GET /api/budgets/overview
export const getBudgets = async (req, res, next) => {
  try {
    const now = new Date();
    const month = req.query.month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const overview = await getBudgetOverview(req.user._id, month);
    res.json({ success: true, data: overview });
  } catch (err) {
    next(err);
  }
};

// @route   POST /api/budgets
export const setBudget = async (req, res, next) => {
  try {
    const { month, category = 'TOTAL', amount, notes = '' } = req.body;

    if (!month || !amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Please provide valid month and budget amount.' });
    }

    // Upsert budget
    const budget = await Budget.findOneAndUpdate(
      { userId: req.user._id, month, category },
      { amount: Number(amount), notes },
      { new: true, upsert: true, runValidators: true }
    );

    // If setting TOTAL budget, also update user default monthlyBudgetGoal
    if (category === 'TOTAL') {
      await User.findByIdAndUpdate(req.user._id, { monthlyBudgetGoal: Number(amount) });
    }

    const overview = await getBudgetOverview(req.user._id, month);

    res.status(200).json({
      success: true,
      message: `${category} budget set for ${month}`,
      data: {
        budget,
        overview,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @route   DELETE /api/budgets/:id
export const deleteBudget = async (req, res, next) => {
  try {
    const budget = await Budget.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!budget) {
      return res.status(404).json({ success: false, message: 'Budget entry not found.' });
    }

    res.json({ success: true, message: 'Budget deleted successfully.' });
  } catch (err) {
    next(err);
  }
};
