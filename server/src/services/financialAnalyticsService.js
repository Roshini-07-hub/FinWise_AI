import mongoose from 'mongoose';
import Transaction from '../models/Transaction.js';
import { getBudgetOverview } from './budgetService.js';

export const getDashboardSummary = async (userId, selectedMonth) => {
  // Determine target month (default to current YYYY-MM)
  const now = new Date();
  const month = selectedMonth || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [yearStr, monthStr] = month.split('-');
  const year = parseInt(yearStr, 10);
  const monthNum = parseInt(monthStr, 10);

  const startOfMonth = new Date(year, monthNum - 1, 1);
  const endOfMonth = new Date(year, monthNum, 0, 23, 59, 59, 999);

  // Previous month dates for comparison
  const prevMonthStart = new Date(year, monthNum - 2, 1);
  const prevMonthEnd = new Date(year, monthNum - 1, 0, 23, 59, 59, 999);

  // 1. Current Month Aggregations
  const currentMonthData = await Transaction.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        date: { $gte: startOfMonth, $lte: endOfMonth }
      }
    },
    {
      $group: {
        _id: '$type',
        total: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    }
  ]);

  let totalIncome = 0;
  let totalExpenses = 0;
  for (const item of currentMonthData) {
    if (item._id === 'income') totalIncome = item.total;
    if (item._id === 'expense') totalExpenses = item.total;
  }

  // 2. Lifetime Total Balance
  const lifetimeBalanceData = await Transaction.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId)
      }
    },
    {
      $group: {
        _id: '$type',
        total: { $sum: '$amount' }
      }
    }
  ]);

  let lifetimeIncome = 0;
  let lifetimeExpenses = 0;
  for (const item of lifetimeBalanceData) {
    if (item._id === 'income') lifetimeIncome = item.total;
    if (item._id === 'expense') lifetimeExpenses = item.total;
  }
  const totalBalance = lifetimeIncome - lifetimeExpenses;

  // 3. Previous Month Aggregations for Comparison
  const prevMonthData = await Transaction.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        date: { $gte: prevMonthStart, $lte: prevMonthEnd }
      }
    },
    {
      $group: {
        _id: '$type',
        total: { $sum: '$amount' }
      }
    }
  ]);

  let prevIncome = 0;
  let prevExpenses = 0;
  for (const item of prevMonthData) {
    if (item._id === 'income') prevIncome = item.total;
    if (item._id === 'expense') prevExpenses = item.total;
  }

  // Percentage changes
  const expenseChangePct = prevExpenses > 0 ? ((totalExpenses - prevExpenses) / prevExpenses) * 100 : 0;
  const incomeChangePct = prevIncome > 0 ? ((totalIncome - prevIncome) / prevIncome) * 100 : 0;

  // 4. Budget Overview
  const budgetData = await getBudgetOverview(userId, month);

  // 5. Category-wise Spending Breakdown
  const categoryBreakdown = await Transaction.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        type: 'expense',
        date: { $gte: startOfMonth, $lte: endOfMonth }
      }
    },
    {
      $group: {
        _id: '$category',
        total: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    },
    { $sort: { total: -1 } }
  ]);

  // 6. Recent Transactions: newest created transactions appear first
  const recentTransactions = await Transaction.find({ userId })
    .sort({ createdAt: -1, date: -1 })
    .limit(7)
    .populate('receiptId', 'originalName fileUrl')
    .lean();

  // 7. Daily Spending Data for Chart
  const dailySpendingAggregation = await Transaction.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        date: { $gte: startOfMonth, $lte: endOfMonth }
      }
    },
    {
      $group: {
        _id: {
          day: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          type: '$type'
        },
        total: { $sum: '$amount' }
      }
    },
    { $sort: { '_id.day': 1 } }
  ]);

  const dailyMap = {};
  for (const d of dailySpendingAggregation) {
    const day = d._id.day;
    if (!dailyMap[day]) {
      dailyMap[day] = { date: day, income: 0, expense: 0 };
    }
    if (d._id.type === 'income') dailyMap[day].income += d.total;
    if (d._id.type === 'expense') dailyMap[day].expense += d.total;
  }

  const dailyTrend = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

  return {
    month,
    summaryCards: {
      totalBalance,
      totalIncome,
      totalExpenses,
      savings: totalIncome - totalExpenses,
      remainingBudget: budgetData.overall.remaining,
      budgetConsumedPercentage: budgetData.overall.percentage,
      comparisonWithPreviousMonth: {
        expenseChangePct: Number(expenseChangePct.toFixed(1)),
        incomeChangePct: Number(incomeChangePct.toFixed(1)),
        prevExpenses,
        prevIncome
      }
    },
    budget: budgetData.overall,
    categoryBreakdown: categoryBreakdown.map(c => ({
      category: c._id,
      total: c.total,
      count: c.count,
      percentage: totalExpenses > 0 ? Number(((c.total / totalExpenses) * 100).toFixed(1)) : 0
    })),
    dailyTrend,
    recentTransactions,
  };
};

/**
 * Filtered Analytics for Analytics Page
 */
export const getAnalyticsData = async (userId, filter = 'this-month', customStart, customEnd) => {
  const now = new Date();
  let startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  let endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  if (filter === 'this-week') {
    const dayOfWeek = now.getDay();
    startDate = new Date(now);
    startDate.setDate(now.getDate() - dayOfWeek);
    startDate.setHours(0, 0, 0, 0);
  } else if (filter === 'last-month') {
    startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
  } else if (filter === 'last-3-months') {
    startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  } else if (filter === 'last-6-months') {
    startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  } else if (filter === 'custom' && customStart && customEnd) {
    startDate = new Date(customStart);
    endDate = new Date(customEnd);
    endDate.setHours(23, 59, 59, 999);
  }

  // 1. Overall Income vs Expense in period
  const totals = await Transaction.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        date: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$type',
        total: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    }
  ]);

  let income = 0;
  let expense = 0;
  for (const t of totals) {
    if (t._id === 'income') income = t.total;
    if (t._id === 'expense') expense = t.total;
  }

  // 2. Category Breakdown
  const categoryData = await Transaction.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        type: 'expense',
        date: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$category',
        total: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    },
    { $sort: { total: -1 } }
  ]);

  // 3. Top Merchants
  const topMerchants = await Transaction.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        type: 'expense',
        merchant: { $ne: '' },
        date: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$merchant',
        total: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    },
    { $sort: { total: -1 } },
    { $limit: 8 }
  ]);

  // 4. Monthly Trend over last 6 months
  const monthlyTrendAgg = await Transaction.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        date: { $gte: new Date(now.getFullYear(), now.getMonth() - 5, 1) }
      }
    },
    {
      $group: {
        _id: {
          month: { $dateToString: { format: '%Y-%m', date: '$date' } },
          type: '$type'
        },
        total: { $sum: '$amount' }
      }
    },
    { $sort: { '_id.month': 1 } }
  ]);

  const monthlyTrendMap = {};
  for (const m of monthlyTrendAgg) {
    const mo = m._id.month;
    if (!monthlyTrendMap[mo]) {
      monthlyTrendMap[mo] = { month: mo, income: 0, expense: 0, savings: 0 };
    }
    if (m._id.type === 'income') monthlyTrendMap[mo].income = m.total;
    if (m._id.type === 'expense') monthlyTrendMap[mo].expense = m.total;
    monthlyTrendMap[mo].savings = monthlyTrendMap[mo].income - monthlyTrendMap[mo].expense;
  }

  return {
    period: {
      filter,
      startDate,
      endDate
    },
    income,
    expense,
    savings: income - expense,
    categoryBreakdown: categoryData.map(c => ({
      name: c._id,
      value: c.total,
      count: c.count
    })),
    topMerchants: topMerchants.map(m => ({
      name: m._id,
      amount: m.total,
      count: m.count
    })),
    monthlyTrend: Object.values(monthlyTrendMap).sort((a, b) => a.month.localeCompare(b.month)),
  };
};
