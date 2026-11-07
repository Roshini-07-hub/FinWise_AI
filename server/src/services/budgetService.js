import Budget from '../models/Budget.js';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';

/**
 * Get comprehensive budget performance for a given month ('YYYY-MM')
 */
export const getBudgetOverview = async (userId, month) => {
  // Parse month date boundary
  const [yearStr, monthStr] = month.split('-');
  const year = parseInt(yearStr, 10);
  const monthNum = parseInt(monthStr, 10);

  const startDate = new Date(year, monthNum - 1, 1);
  const endDate = new Date(year, monthNum, 0, 23, 59, 59, 999);

  // Fetch all budgets set for this month
  const budgets = await Budget.find({ userId, month }).lean();
  let totalBudgetDoc = budgets.find(b => b.category === 'TOTAL');

  // Fallback to user monthly goal if no explicit total budget doc exists
  if (!totalBudgetDoc) {
    const user = await User.findById(userId).select('monthlyBudgetGoal');
    totalBudgetDoc = {
      category: 'TOTAL',
      amount: user?.monthlyBudgetGoal || 50000,
      month,
      isDefaultGoal: true,
    };
  }

  // Aggregate eligible expense transactions for this month (excluding income)
  const expenseAggregation = await Transaction.aggregate([
    {
      $match: {
        userId,
        type: 'expense',
        date: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: '$category',
        totalSpent: { $sum: '$amount' },
        transactionCount: { $sum: 1 },
      },
    },
  ]);

  const categorySpendingMap = {};
  let overallSpent = 0;

  for (const item of expenseAggregation) {
    categorySpendingMap[item._id] = item.totalSpent;
    overallSpent += item.totalSpent;
  }

  // Calculate overall budget metrics
  const totalAmount = totalBudgetDoc.amount;
  const remainingBudget = Math.max(0, totalAmount - overallSpent);
  const percentageConsumed = totalAmount > 0 ? (overallSpent / totalAmount) * 100 : 0;

  let overallStatus = 'normal'; // 'normal' | 'warning' | 'critical' | 'exceeded'
  if (percentageConsumed >= 100) overallStatus = 'exceeded';
  else if (percentageConsumed >= 90) overallStatus = 'critical';
  else if (percentageConsumed >= 70) overallStatus = 'warning';

  // Process category specific budgets
  const categoryBudgets = [];
  const notifications = [];

  // Check overall alert
  if (percentageConsumed >= 100) {
    notifications.push({
      type: 'danger',
      category: 'Overall Budget',
      message: `Alert: You have exceeded your total monthly budget by ₹${(overallSpent - totalAmount).toLocaleString('en-IN')} (${percentageConsumed.toFixed(1)}% consumed).`,
    });
  } else if (percentageConsumed >= 90) {
    notifications.push({
      type: 'warning',
      category: 'Overall Budget',
      message: `Caution: You have utilized ${percentageConsumed.toFixed(1)}% of your total monthly budget. Only ₹${remainingBudget.toLocaleString('en-IN')} remaining.`,
    });
  } else if (percentageConsumed >= 70) {
    notifications.push({
      type: 'info',
      category: 'Overall Budget',
      message: `Notice: You have reached 70% (${percentageConsumed.toFixed(1)}%) of your monthly budget limit.`,
    });
  }

  for (const b of budgets) {
    if (b.category === 'TOTAL') continue;

    const spent = categorySpendingMap[b.category] || 0;
    const catRemaining = Math.max(0, b.amount - spent);
    const catPct = b.amount > 0 ? (spent / b.amount) * 100 : 0;

    let catStatus = 'normal';
    if (catPct >= 100) {
      catStatus = 'exceeded';
      notifications.push({
        type: 'danger',
        category: b.category,
        message: `Your ${b.category} budget has been exceeded! Spent: ₹${spent.toLocaleString('en-IN')} of ₹${b.amount.toLocaleString('en-IN')}.`,
      });
    } else if (catPct >= 90) {
      catStatus = 'critical';
      notifications.push({
        type: 'warning',
        category: b.category,
        message: `Your ${b.category} budget is at ${catPct.toFixed(1)}% (₹${spent.toLocaleString('en-IN')} / ₹${b.amount.toLocaleString('en-IN')}).`,
      });
    } else if (catPct >= 70) {
      catStatus = 'warning';
      notifications.push({
        type: 'info',
        category: b.category,
        message: `Your ${b.category} budget has reached 70% threshold.`,
      });
    }

    categoryBudgets.push({
      _id: b._id,
      category: b.category,
      amount: b.amount,
      spent,
      remaining: catRemaining,
      percentage: Number(catPct.toFixed(1)),
      status: catStatus,
      notes: b.notes,
    });
  }

  return {
    month,
    overall: {
      budget: totalAmount,
      spent: overallSpent,
      remaining: remainingBudget,
      percentage: Number(percentageConsumed.toFixed(1)),
      status: overallStatus,
      isDefaultGoal: Boolean(totalBudgetDoc.isDefaultGoal),
      id: totalBudgetDoc._id || null,
    },
    categoryBudgets,
    notifications,
    refundPolicyExplanation: "Note: Income, cash refunds, and reimbursements are excluded from expense limits and instead credited directly to your total liquid balance.",
  };
};
