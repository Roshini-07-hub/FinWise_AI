import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Calendar,
  Filter,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownLeft,
  PieChart as PieIcon,
  Store,
  Wallet,
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
  Legend,
  AreaChart,
  Area,
  CartesianGrid,
} from 'recharts';
import { useFinance } from '../context/FinanceContext';
import { analyticsApi } from '../services/api';

const COLORS = [
  '#4f46e5',
  '#06b6d4',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#64748b',
  '#84cc16',
  '#14b8a6',
];

export default function Analytics() {
  const { formatCurrency, refreshKey } = useFinance();

  const [filter, setFilter] = useState('this-month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const params = {
          filter,
          startDate: filter === 'custom' ? customStart : undefined,
          endDate: filter === 'custom' ? customEnd : undefined,
        };
        const res = await analyticsApi.getCharts(params);
        if (res.data?.success) {
          setAnalytics(res.data.data);
        }
      } catch (err) {
        console.error('Failed to load analytics charts:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [filter, customStart, customEnd, refreshKey]);

  const categoryBreakdown = analytics?.categoryBreakdown || [];
  const topMerchants = analytics?.topMerchants || [];
  const monthlyTrend = analytics?.monthlyTrend || [];
  const income = analytics?.income || 0;
  const expense = analytics?.expense || 0;
  const savings = analytics?.savings || 0;

  return (
    <div className="space-y-6">
      {/* Page Header & Period Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Financial Charts & Analytics</h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">
            Deep dive into your cash flows, category allocations, and top merchant trends
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-white border border-slate-200/80 rounded-xl shadow-2xs text-xs">
          {[
            { label: 'This Week', val: 'this-week' },
            { label: 'This Month', val: 'this-month' },
            { label: 'Last Month', val: 'last-month' },
            { label: 'Last 3M', val: 'last-3-months' },
            { label: 'Last 6M', val: 'last-6-months' },
            { label: 'Custom', val: 'custom' },
          ].map((item) => (
            <button
              key={item.val}
              onClick={() => setFilter(item.val)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                filter === item.val
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Date Range selector if active */}
      {filter === 'custom' && (
        <div className="p-4 bg-white border border-slate-200/80 rounded-xl flex items-center space-x-3 text-xs shadow-2xs">
          <span className="font-semibold text-slate-700">Custom Date Range:</span>
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg outline-none"
          />
          <span className="text-slate-400">to</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg outline-none"
          />
        </div>
      )}

      {/* KPI Overview Strip for the Period */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Inflow</span>
            <p className="text-xl font-extrabold text-emerald-600 mt-1">{formatCurrency(income)}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
            <ArrowDownLeft className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Outflow</span>
            <p className="text-xl font-extrabold text-rose-600 mt-1">{formatCurrency(expense)}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Period Net Savings</span>
            <p className={`text-xl font-extrabold mt-1 ${savings >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
              {formatCurrency(savings)}
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Multi-Month Income vs Expense Trend Area Chart */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900">6-Month Financial Trajectory</h2>
          <p className="text-xs text-slate-400">Monthly comparison of total earned income vs total expenditure</p>
        </div>

        <div className="h-72 w-full">
          {monthlyTrend.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              No historical data available.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
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
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorIncome)" name="Income" />
                <Area type="monotone" dataKey="expense" stroke="#f43f5e" strokeWidth={2.5} fillOpacity={1} fill="url(#colorExpense)" name="Expenses" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Row 2: Category Pie Chart & Top Merchants Bar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown Donut */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div className="mb-4">
            <h2 className="text-sm font-bold text-slate-900">Category Allocations</h2>
            <p className="text-xs text-slate-400">Proportional spending across active categories</p>
          </div>

          <div className="h-64 flex items-center justify-center">
            {categoryBreakdown.length === 0 ? (
              <span className="text-xs text-slate-400">No category transactions in this period.</span>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryBreakdown}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                  >
                    {categoryBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val) => [formatCurrency(val), 'Spent']}
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Top Merchants by Spending (Bar Chart) */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div className="mb-4">
            <h2 className="text-sm font-bold text-slate-900">Top Merchants by Spend</h2>
            <p className="text-xs text-slate-400">Stores and vendors receiving the highest outflows</p>
          </div>

          <div className="h-64 flex items-center justify-center">
            {topMerchants.length === 0 ? (
              <span className="text-xs text-slate-400">No merchant data in this period.</span>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topMerchants} layout="vertical" margin={{ top: 5, right: 15, left: 25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis
                    type="number"
                    tickFormatter={(val) => `₹${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`}
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#334155' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(val, name, item) => [formatCurrency(val), `${item.payload.count} transactions`]}
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  />
                  <Bar dataKey="amount" fill="#4f46e5" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
