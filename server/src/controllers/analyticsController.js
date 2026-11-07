import Transaction from '../models/Transaction.js';
import { getDashboardSummary, getAnalyticsData } from '../services/financialAnalyticsService.js';
import { generateTransactionsCsv } from '../services/csvExportService.js';

// @route   GET /api/analytics/dashboard
export const getDashboard = async (req, res, next) => {
  try {
    const { month } = req.query;
    const summary = await getDashboardSummary(req.user._id, month);
    res.json({ success: true, data: summary });
  } catch (err) {
    next(err);
  }
};

// @route   GET /api/analytics/charts
export const getAnalytics = async (req, res, next) => {
  try {
    const { filter = 'this-month', startDate, endDate } = req.query;
    const data = await getAnalyticsData(req.user._id, filter, startDate, endDate);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// @route   GET /api/analytics/export-csv
export const exportCsv = async (req, res, next) => {
  try {
    const { category, type, startDate, endDate, month } = req.query;
    const query = { userId: req.user._id };

    if (category && category !== 'all') {
      query.category = category;
    }
    if (type && type !== 'all') {
      query.type = type;
    }

    if (month) {
      const [yearStr, monthStr] = month.split('-');
      const year = parseInt(yearStr, 10);
      const m = parseInt(monthStr, 10);
      query.date = {
        $gte: new Date(year, m - 1, 1),
        $lte: new Date(year, m, 0, 23, 59, 59, 999),
      };
    } else if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    const transactions = await Transaction.find(query).sort({ date: -1 }).lean();
    const csvContent = generateTransactionsCsv(transactions);

    const filename = `finwise-transactions-${month || 'export'}-${Date.now()}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csvContent);
  } catch (err) {
    next(err);
  }
};
