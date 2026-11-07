import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  PiggyBank,
  Target,
  Plus,
  FileUp,
  ChevronRight,
  ArrowRight,
  Sparkles,
  Receipt as ReceiptIcon,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Layers,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts';
import { useFinance } from '../context/FinanceContext';
import { analyticsApi, insightApi } from '../services/api';

const CATEGORY_COLORS = [
  '#4f46e5',
  '#06b6d4',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#64748b',
];

export default function Overview() {
  const { selectedMonth, formatCurrency, setIsAddTxModalOpen, refreshKey } = useFinance();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [topInsight, setTopInsight] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        setError('');
        const [dashRes, insightRes] = await Promise.all([
          analyticsApi.getDashboard(selectedMonth),
          insightApi.getAll(selectedMonth).catch(() => ({ data: { data: [] } })),
        ]);

        if (dashRes.data?.success) {
          setData(dashRes.data.data);
        }
        if (insightRes.data?.data && insightRes.data.data.length > 0) {
          setTopInsight(insightRes.data.data[0]);
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
        setError('Unable to load dashboard metrics. Ensure server is running.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [selectedMonth, refreshKey]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded-lg w-1/4"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-200 rounded-2xl"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-80 bg-slate-200 rounded-2xl"></div>
          <div className="h-80 bg-slate-200 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  const summary = data?.summaryCards || {
    totalBalance: 0,
    totalIncome: 0,
    totalExpenses: 0,
    savings: 0,
    remainingBudget: 0,
    budgetConsumedPercentage: 0,
    comparisonWithPreviousMonth: { expenseChangePct: 0, incomeChangePct: 0 },
  };

  const budget = data?.budget || { budget: 0, spent: 0, remaining: 0, percentage: 0 };
  const recentTransactions = data?.recentTransactions || [];
  const categoryBreakdown = data?.categoryBreakdown || [];
  const dailyTrend = data?.dailyTrend || [];

  // Determine budget progress bar color
  let progressBg = 'bg-emerald-500';
  let progressText = 'text-emerald-700 bg-emerald-50';
  if (budget.percentage >= 90) {
    progressBg = 'bg-rose-500';
    progressText = 'text-rose-700 bg-rose-50';
  } else if (budget.percentage >= 70) {
    progressBg = 'bg-amber-500';
    progressText = 'text-amber-700 bg-amber-50';
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Financial Overview</h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">
            Real-time analytics and dynamic budget health for {selectedMonth}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Link
            to="/receipts"
            className="flex items-center space-x-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-2xs transition-all"
          >
            <FileUp className="w-4 h-4 text-indigo-600" />
            <span>Upload Receipt</span>
          </Link>
          <button
            onClick={() => setIsAddTxModalOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-indigo-100 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Transaction</span>
          </button>
        </div>
      </div>

      {/* Top AI Insight Banner */}
      {topInsight && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50/80 via-white to-indigo-50/40 border border-indigo-100/90 shadow-2xs flex items-center justify-between">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs mt-0.5">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-indigo-950 uppercase tracking-wider">AI Financial Insight</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-indigo-100 text-indigo-700 font-bold uppercase">
                  {topInsight.type}
                </span>
              </div>
              <p className="text-xs md:text-sm font-semibold text-slate-800 mt-0.5">{topInsight.title}</p>
              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{topInsight.message}</p>
            </div>
          </div>
          <Link
            to="/assistant"
            className="hidden sm:flex items-center space-x-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 whitespace-nowrap pl-4"
          >
            <span>Ask AI</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* 5 Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Liquid Balance */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs card-hover">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Balance</span>
            <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl md:text-2xl font-extrabold text-slate-900 mt-2">
            {formatCurrency(summary.totalBalance)}
          </p>
          <div className="flex items-center space-x-1 text-[11px] font-semibold text-slate-500 mt-1">
            <span>Lifetime net cash position</span>
          </div>
        </div>

        {/* Total Income */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs card-hover">
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Income</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl md:text-2xl font-extrabold text-emerald-600 mt-2">
            {formatCurrency(summary.totalIncome)}
          </p>
          <div className="flex items-center space-x-1 text-[11px] font-semibold text-slate-500 mt-1">
            {summary.comparisonWithPreviousMonth.incomeChangePct >= 0 ? (
              <span className="text-emerald-600 flex items-center">
                <TrendingUp className="w-3 h-3 mr-0.5" />
                +{summary.comparisonWithPreviousMonth.incomeChangePct}%
              </span>
            ) : (
              <span className="text-rose-600 flex items-center">
                <TrendingDown className="w-3 h-3 mr-0.5" />
                {summary.comparisonWithPreviousMonth.incomeChangePct}%
              </span>
            )}
            <span className="text-slate-400">vs prev month</span>
          </div>
        </div>

        {/* Total Expenses */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs card-hover">
          <div className="flex items-center justify-between text-rose-600">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Expenses</span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl md:text-2xl font-extrabold text-rose-600 mt-2">
            {formatCurrency(summary.totalExpenses)}
          </p>
          <div className="flex items-center space-x-1 text-[11px] font-semibold text-slate-500 mt-1">
            {summary.comparisonWithPreviousMonth.expenseChangePct > 0 ? (
              <span className="text-rose-600 flex items-center">
                <TrendingUp className="w-3 h-3 mr-0.5" />
                +{summary.comparisonWithPreviousMonth.expenseChangePct}%
              </span>
            ) : (
              <span className="text-emerald-600 flex items-center">
                <TrendingDown className="w-3 h-3 mr-0.5" />
                {summary.comparisonWithPreviousMonth.expenseChangePct}%
              </span>
            )}
            <span className="text-slate-400">vs prev month</span>
          </div>
        </div>

        {/* Remaining Monthly Budget */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs card-hover">
          <div className="flex items-center justify-between text-indigo-600">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Budget Left</span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl md:text-2xl font-extrabold text-indigo-900 mt-2">
            {formatCurrency(summary.remainingBudget)}
          </p>
          <div className="flex items-center space-x-1 text-[11px] font-semibold text-slate-500 mt-1">
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${progressText}`}>
              {summary.budgetConsumedPercentage}% used
            </span>
          </div>
        </div>

        {/* Net Savings */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs card-hover">
          <div className="flex items-center justify-between text-indigo-600">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Net Savings</span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <PiggyBank className="w-4 h-4" />
            </div>
          </div>
          <p className={`text-xl md:text-2xl font-extrabold mt-2 ${summary.savings >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
            {formatCurrency(summary.savings)}
          </p>
          <div className="flex items-center space-x-1 text-[11px] font-semibold text-slate-500 mt-1">
            <span>
              {summary.totalIncome > 0
                ? `${((summary.savings / summary.totalIncome) * 100).toFixed(0)}% savings rate`
                : 'No income logged'}
            </span>
          </div>
        </div>
      </div>

      {/* Monthly Budget Performance Banner */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-bold text-slate-900">Monthly Budget Target</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${progressText}`}>
              {budget.percentage}% consumed
            </span>
          </div>
          <div className="text-xs text-slate-500">
            Spent <strong>{formatCurrency(budget.spent)}</strong> of <strong>{formatCurrency(budget.budget)}</strong> (Remaining: {formatCurrency(budget.remaining)})
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full ${progressBg} transition-all duration-500 rounded-full`}
            style={{ width: `${Math.min(100, budget.percentage)}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1.5 font-medium">
          <span>0%</span>
          <span>70% threshold</span>
          <span>90% critical</span>
          <span>100% budget limit</span>
        </div>
      </div>

      {/* Visual Analytics Grid: Daily Spending & Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Spending Trend (Line Chart) */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Spending & Income Flow</h2>
              <p className="text-xs text-slate-400">Daily cash flow movements across {selectedMonth}</p>
            </div>
            <Link
              to="/analytics"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1"
            >
              <span>Full Analytics</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="h-64 w-full">
            {dailyTrend.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No daily transaction activity in this month yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(val) => val.slice(8)} // show day only
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(val) => `₹${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`}
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(val, name) => [
                      formatCurrency(val),
                      String(name).toLowerCase().includes('expense') ? 'Expenses' : 'Income',
                    ]}
                    labelFormatter={(val) => `Date: ${val}`}
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="expense"
                    stroke="#f43f5e"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: '#f43f5e' }}
                    name="expense"
                  />
                  <Line
                    type="monotone"
                    dataKey="income"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: '#10b981' }}
                    name="income"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Category Breakdown (Donut Chart) */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-slate-900">Category Breakdown</h2>
              <span className="text-xs font-semibold text-slate-400">{categoryBreakdown.length} categories</span>
            </div>
            <p className="text-xs text-slate-400 mb-4">Top expense categories by spend</p>
          </div>

          <div className="h-44 relative flex items-center justify-center">
            {categoryBreakdown.length === 0 ? (
              <span className="text-xs text-slate-400">No expense records</span>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryBreakdown}
                    dataKey="total"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                  >
                    {categoryBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val) => [formatCurrency(val), 'Total Spent']}
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="space-y-1.5 mt-2 max-h-36 overflow-y-auto">
            {categoryBreakdown.slice(0, 4).map((c, idx) => (
              <div key={c.category} className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }}
                  />
                  <span className="text-slate-700 font-medium truncate max-w-[120px]">{c.category}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-slate-900">{formatCurrency(c.total)}</span>
                  <span className="text-[10px] text-slate-400">({c.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Transactions List */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Recent Transactions</h2>
            <p className="text-xs text-slate-400">Latest income and expense entries</p>
          </div>
          <Link
            to="/transactions"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          {recentTransactions.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No transactions found. Click "+ Add Transaction" or "Upload Receipt" to get started!
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider text-[10px]">
                  <th className="pb-3 font-semibold">Title & Merchant</th>
                  <th className="pb-3 font-semibold">Category</th>
                  <th className="pb-3 font-semibold">Date</th>
                  <th className="pb-3 font-semibold">Payment Method</th>
                  <th className="pb-3 font-semibold text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentTransactions.map((tx) => (
                  <tr key={tx._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 pr-3">
                      <div className="flex items-center space-x-2.5">
                        <div
                          className={`p-2 rounded-xl flex-shrink-0 ${
                            tx.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {tx.type === 'income' ? (
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                            {tx.title}
                            {tx.receiptId && (
                              <span title="Receipt attached" className="text-indigo-500">
                                <ReceiptIcon className="w-3.5 h-3.5" />
                              </span>
                            )}
                          </p>
                          {tx.merchant && <p className="text-[11px] text-slate-400">{tx.merchant}</p>}
                        </div>
                      </div>
                    </td>

                    <td className="py-3 pr-3">
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-100 text-slate-700">
                        {tx.category}
                      </span>
                    </td>

                    <td className="py-3 pr-3 text-slate-500">
                      {new Date(tx.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>

                    <td className="py-3 pr-3 text-slate-500">{tx.paymentMethod || 'UPI'}</td>

                    <td
                      className={`py-3 text-right font-bold text-sm ${
                        tx.type === 'income' ? 'text-emerald-600' : 'text-slate-900'
                      }`}
                    >
                      {tx.type === 'income' ? '+' : '-'}
                      {formatCurrency(tx.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
