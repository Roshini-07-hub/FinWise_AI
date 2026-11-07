import React, { useState, useEffect } from 'react';
import {
  ShoppingCart,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Clock,
  XCircle,
  TrendingDown,
  TrendingUp,
  Wallet,
  PiggyBank,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Trash2,
  HelpCircle,
  CreditCard,
  Banknote,
  Percent,
  Check,
  Info,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  Cell,
} from 'recharts';
import { useFinance } from '../context/FinanceContext';
import { purchaseAssistantApi } from '../services/api';

const PREDEFINED_CATEGORIES = [
  'Shopping',
  'Electronics',
  'Groceries',
  'Food & Dining',
  'Healthcare',
  'Entertainment',
  'Transportation',
  'Utilities',
  'Travel',
  'Personal Care',
  'Other',
];

const PAYMENT_METHODS = ['UPI', 'Credit Card', 'Debit Card', 'Cash', 'EMI'];

export default function BeforeYouBuy() {
  const { formatCurrency, selectedMonth, refreshKey } = useFinance();

  // Form input state
  const [productName, setProductName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('Shopping');
  const [purchasePriority, setPurchasePriority] = useState('Important'); // 'Essential' | 'Important' | 'Luxury'
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // EMI specific states
  const [downPayment, setDownPayment] = useState('');
  const [tenureMonths, setTenureMonths] = useState(6);

  // Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [currentEvaluation, setCurrentEvaluation] = useState(null);

  // History state
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Interactive custom savings calculator state
  const [customMonthlySavings, setCustomMonthlySavings] = useState('');
  const [customPlan, setCustomPlan] = useState(null);
  const [isUpdatingPlan, setIsUpdatingPlan] = useState(false);

  // Load history on mount or refresh
  const fetchHistory = async () => {
    try {
      setLoadingHistory(true);
      const res = await purchaseAssistantApi.getHistory();
      if (res.data?.success) {
        setHistory(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load evaluation history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [refreshKey]);

  // Handle Form Submit
  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!productName || !price || Number(price) <= 0) {
      setAnalysisError('Please enter a product name and valid purchase price.');
      return;
    }

    try {
      setIsAnalyzing(true);
      setAnalysisError('');

      const payload = {
        productName: productName.trim(),
        price: Number(price),
        category,
        purchasePriority,
        paymentMethod,
        purchaseDate,
        notes: notes.trim(),
        month: selectedMonth,
        emiDetails: {
          isEmi: paymentMethod === 'EMI',
          downPayment: Number(downPayment) || 0,
          tenureMonths: Number(tenureMonths) || 6,
          monthlyInstallment:
            paymentMethod === 'EMI'
              ? Math.round(
                  (Number(price) - (Number(downPayment) || 0)) / Math.max(1, Number(tenureMonths) || 6)
                )
              : 0,
        },
      };

      const res = await purchaseAssistantApi.analyze(payload);
      if (res.data?.success) {
        setCurrentEvaluation(res.data.data);
        setCustomPlan(null);
        setCustomMonthlySavings('');
        fetchHistory();
      }
    } catch (err) {
      console.error('Purchase analysis failed:', err);
      setAnalysisError(err.response?.data?.message || 'Failed to analyze purchase affordability.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Recalculate savings plan dynamically
  const handleRecalculatePlan = async (amountVal) => {
    if (!currentEvaluation || !amountVal || Number(amountVal) <= 0) return;
    try {
      setIsUpdatingPlan(true);
      const res = await purchaseAssistantApi.recalculateSavingsPlan({
        price: currentEvaluation.price,
        customMonthlySavings: Number(amountVal),
      });
      if (res.data?.success) {
        setCustomPlan(res.data.data);
      }
    } catch (err) {
      console.error('Failed to recalculate savings plan:', err);
    } finally {
      setIsUpdatingPlan(false);
    }
  };

  // Delete evaluation from history
  const handleDeleteEvaluation = async (id) => {
    try {
      await purchaseAssistantApi.deleteEvaluation(id);
      setDeleteConfirmId(null);
      if (currentEvaluation?._id === id) {
        setCurrentEvaluation(null);
      }
      fetchHistory();
    } catch (err) {
      console.error('Failed to delete evaluation:', err);
    }
  };

  // Decision UI configuration
  const getDecisionConfig = (decision) => {
    switch (decision) {
      case 'AFFORDABLE':
        return {
          title: 'Affordable Purchase',
          subtitle: 'This purchase comfortably fits within your current budget and cashflow.',
          badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          gradientBg: 'from-emerald-500/10 via-emerald-500/5 to-transparent',
          borderColor: 'border-emerald-200/90',
          accentColor: '#10b981',
          icon: CheckCircle2,
          textColor: 'text-emerald-700',
        };
      case 'AFFORDABLE WITH CAUTION':
        return {
          title: 'Affordable with Caution',
          subtitle: 'Feasible, but it will consume a large portion of your remaining monthly buffer.',
          badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
          gradientBg: 'from-amber-500/10 via-amber-500/5 to-transparent',
          borderColor: 'border-amber-200/90',
          accentColor: '#f59e0b',
          icon: AlertTriangle,
          textColor: 'text-amber-700',
        };
      case 'WAIT AND SAVE':
        return {
          title: 'Wait & Save Recommended',
          subtitle: 'Exceeds your remaining budget. Stashing a small monthly goal will make it stress-free.',
          badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          gradientBg: 'from-indigo-500/10 via-indigo-500/5 to-transparent',
          borderColor: 'border-indigo-200/90',
          accentColor: '#6366f1',
          icon: Clock,
          textColor: 'text-indigo-700',
        };
      case 'NOT RECOMMENDED RIGHT NOW':
      default:
        return {
          title: 'Not Recommended Right Now',
          subtitle: 'This purchase would severely exceed your monthly allowance and create financial risk.',
          badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
          gradientBg: 'from-rose-500/10 via-rose-500/5 to-transparent',
          borderColor: 'border-rose-200/90',
          accentColor: '#ef4444',
          icon: XCircle,
          textColor: 'text-rose-700',
        };
    }
  };

  const activePlan = customPlan || currentEvaluation?.savingsPlan;

  // Comparison Chart Data
  const comparisonChartData = currentEvaluation
    ? [
        {
          name: 'Monthly Expenses',
          Before: currentEvaluation.financialSnapshot.currentMonthlyExpenses,
          After: currentEvaluation.financialSnapshot.projectedMonthlyExpenses,
        },
        {
          name: 'Remaining Budget',
          Before: currentEvaluation.financialSnapshot.currentRemainingBudget,
          After: Math.max(0, currentEvaluation.financialSnapshot.projectedRemainingBudget),
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">AI Before-You-Buy Assistant</h1>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold tracking-wide shadow-xs">
              Pre-Purchase AI
            </span>
          </div>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Evaluate prospective purchases against your live budget, cashflow, and spending capacity before you spend.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-2xs text-xs font-semibold text-slate-700 flex items-center space-x-1.5">
            <Calendar className="w-3.5 h-3.5 text-indigo-600" />
            <span>Target Month: {selectedMonth}</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Input Form (Left) & Verdict/Analysis (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Purchase Evaluation Form (5 cols) */}
        <div className="lg:col-span-5 bg-white p-5 md:p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <ShoppingCart className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Purchase Evaluation Form</h2>
              <p className="text-[11px] text-slate-400">Enter item details for real-time AI budget simulation</p>
            </div>
          </div>

          <form onSubmit={handleAnalyze} className="space-y-3.5 text-xs">
            {/* Product Name */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Product Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. iPhone 15, Noise-Cancelling Headphones, Office Desk"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 text-slate-900 font-medium"
              />
            </div>

            {/* Price & Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Product Price (₹) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    required
                    min="1"
                    step="any"
                    placeholder="25000"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 text-slate-900 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white font-medium text-slate-800"
                >
                  {PREDEFINED_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Priority Selection Pills */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">Purchase Priority</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'Essential', desc: 'Need for work/health', color: 'indigo' },
                  { id: 'Important', desc: 'Significant value', color: 'blue' },
                  { id: 'Luxury', desc: 'Discretionary desire', color: 'purple' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setPurchasePriority(item.id)}
                    className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                      purchasePriority === item.id
                        ? 'border-indigo-600 bg-indigo-50/60 text-indigo-900 shadow-2xs ring-1 ring-indigo-600'
                        : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100 text-slate-600'
                    }`}
                  >
                    <span className="block font-bold text-xs">{item.id}</span>
                    <span className="block text-[10px] text-slate-400 truncate">{item.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Method & Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white font-medium text-slate-800"
                >
                  {PAYMENT_METHODS.map((pm) => (
                    <option key={pm} value={pm}>
                      {pm}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target Purchase Date</label>
                <input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white text-slate-800"
                />
              </div>
            </div>

            {/* EMI Parameters Drawer (if EMI selected) */}
            {paymentMethod === 'EMI' && (
              <div className="p-3.5 rounded-xl bg-indigo-50/50 border border-indigo-100 space-y-2.5 animate-in fade-in duration-200">
                <span className="font-bold text-indigo-950 flex items-center space-x-1 text-xs">
                  <Percent className="w-3.5 h-3.5 text-indigo-600" />
                  <span>EMI Breakdown Details</span>
                </span>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Down Payment (₹)
                    </label>
                    <input
                      type="number"
                      placeholder="0"
                      value={downPayment}
                      onChange={(e) => setDownPayment(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Tenure (Months)
                    </label>
                    <select
                      value={tenureMonths}
                      onChange={(e) => setTenureMonths(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none"
                    >
                      {[3, 6, 9, 12, 18, 24].map((m) => (
                        <option key={m} value={m}>
                          {m} Months
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {price && (
                  <p className="text-[11px] text-indigo-700 font-medium">
                    Estimated monthly installment: ₹
                    {Math.round(
                      (Number(price) - (Number(downPayment) || 0)) / Math.max(1, Number(tenureMonths) || 6)
                    ).toLocaleString('en-IN')}{' '}
                    / month
                  </p>
                )}
              </div>
            )}

            {/* Optional Notes */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Optional Notes / Intended Store</label>
              <input
                type="text"
                placeholder="e.g. Croma sale discount, needed for remote freelance contract"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white text-slate-800"
              />
            </div>

            {analysisError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{analysisError}</span>
              </div>
            )}

            {/* Prominent Action Button */}
            <button
              type="submit"
              disabled={isAnalyzing}
              className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-indigo-600 via-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-100 flex items-center justify-center space-x-2 transition-all cursor-pointer"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Evaluating live budget & running AI model...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Analyze My Purchase</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: AI Verdict & Financial Simulation (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {!currentEvaluation ? (
            /* Empty State Placeholder */
            <div className="p-10 bg-white rounded-2xl border border-slate-200/90 shadow-2xs text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">No Purchase Analyzed Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                Fill in the item details on the left and click <b>Analyze My Purchase</b> to calculate
                affordability, simulate budget impacts, and generate a personalized savings strategy.
              </p>
              <div className="pt-2 flex items-center justify-center space-x-4 text-[11px] text-slate-400">
                <span className="flex items-center space-x-1">
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Verified MongoDB math</span>
                </span>
                <span className="flex items-center space-x-1">
                  <Check className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Groq AI reasoning</span>
                </span>
                <span className="flex items-center space-x-1">
                  <Check className="w-3.5 h-3.5 text-purple-500" />
                  <span>Before vs After impact</span>
                </span>
              </div>
            </div>
          ) : (
            /* Active Analysis View */
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Verdict Card Banner */}
              {(() => {
                const config = getDecisionConfig(currentEvaluation.decision);
                const IconComponent = config.icon;
                return (
                  <div
                    className={`p-5 rounded-2xl bg-gradient-to-r ${config.gradientBg} bg-white border ${config.borderColor} shadow-2xs space-y-4`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start space-x-3">
                        <div className={`p-2.5 rounded-xl ${config.badgeBg} border`}>
                          <IconComponent className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span
                              className={`text-[11px] px-2.5 py-0.5 rounded-full font-extrabold uppercase tracking-wider border ${config.badgeBg}`}
                            >
                              {currentEvaluation.decision}
                            </span>
                            <span className="text-xs text-slate-400">
                              Product: <b>{currentEvaluation.productName}</b> ({formatCurrency(currentEvaluation.price)})
                            </span>
                          </div>
                          <h2 className="text-base font-extrabold text-slate-900 mt-1">
                            {config.title}
                          </h2>
                          <p className="text-xs text-slate-600 mt-0.5">{config.subtitle}</p>
                        </div>
                      </div>

                      {/* Affordability Score Gauge */}
                      <div className="p-3 rounded-2xl bg-white border border-slate-200/80 shadow-2xs text-center flex-shrink-0 min-w-[110px]">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Affordability Score
                        </span>
                        <div className="flex items-baseline justify-center space-x-1 mt-0.5">
                          <span
                            className="text-2xl font-black"
                            style={{ color: config.accentColor }}
                          >
                            {currentEvaluation.affordabilityScore}
                          </span>
                          <span className="text-xs font-semibold text-slate-400">/ 100</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${currentEvaluation.affordabilityScore}%`,
                              backgroundColor: config.accentColor,
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* AI Executive Summary */}
                    {currentEvaluation.aiExplanation?.summary && (
                      <div className="p-3.5 rounded-xl bg-white/90 border border-slate-200/80 text-xs text-slate-800 leading-relaxed">
                        <p className="font-semibold text-slate-900 flex items-center space-x-1.5 mb-1">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                          <span>AI Financial Verdict:</span>
                        </p>
                        <p className="text-slate-700">{currentEvaluation.aiExplanation.summary}</p>
                      </div>
                    )}

                    {/* Reasons & Potential Risks Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      {/* Key Reasons */}
                      <div className="p-3 rounded-xl bg-white/80 border border-slate-200/80 space-y-1.5">
                        <span className="font-bold text-slate-900 flex items-center space-x-1 text-[11px] uppercase tracking-wider">
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>Key Decision Factors</span>
                        </span>
                        <ul className="space-y-1 text-slate-600">
                          {currentEvaluation.aiExplanation?.reasons?.map((r, i) => (
                            <li key={i} className="flex items-start space-x-1.5 text-[11px]">
                              <span className="text-indigo-500 font-bold">•</span>
                              <span>{r}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Potential Risks */}
                      <div className="p-3 rounded-xl bg-white/80 border border-slate-200/80 space-y-1.5">
                        <span className="font-bold text-slate-900 flex items-center space-x-1 text-[11px] uppercase tracking-wider">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          <span>Potential Financial Risks</span>
                        </span>
                        <ul className="space-y-1 text-slate-600">
                          {currentEvaluation.aiExplanation?.risks?.map((rk, i) => (
                            <li key={i} className="flex items-start space-x-1.5 text-[11px]">
                              <span className="text-rose-500 font-bold">•</span>
                              <span>{rk}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Recommendations & Suggested Date */}
                    {currentEvaluation.aiExplanation?.recommendations && (
                      <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-950 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[11px] uppercase tracking-wider text-indigo-900 flex items-center space-x-1">
                            <Sparkles className="w-3 h-3 text-indigo-600" />
                            <span>Personalized Next Steps</span>
                          </span>
                          {currentEvaluation.aiExplanation.suggestedDate && (
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 font-bold">
                              Timeline: {currentEvaluation.aiExplanation.suggestedDate}
                            </span>
                          )}
                        </div>
                        <ul className="space-y-1 text-indigo-900/90 text-[11px]">
                          {currentEvaluation.aiExplanation.recommendations.map((rec, i) => (
                            <li key={i} className="flex items-start space-x-1.5">
                              <span className="text-indigo-600 font-bold">✓</span>
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Before-and-After Financial Comparison Cards */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Before-and-After Financial Simulation</h3>
                    <p className="text-[11px] text-slate-400">
                      Comparison of verified baseline metrics vs projected post-purchase position
                    </p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold">
                    Simulated Projection
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* BEFORE CARD */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Before Purchase
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-bold">
                        Actual Baseline
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Current Monthly Expenses:</span>
                        <span className="font-bold text-slate-900">
                          {formatCurrency(currentEvaluation.financialSnapshot.currentMonthlyExpenses)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Remaining Monthly Budget:</span>
                        <span className="font-bold text-emerald-600">
                          {formatCurrency(currentEvaluation.financialSnapshot.currentRemainingBudget)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Monthly Net Savings:</span>
                        <span className="font-bold text-slate-900">
                          {formatCurrency(currentEvaluation.financialSnapshot.currentNetSavings)}
                        </span>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                        <span>Budget Utilization</span>
                        <span className="font-bold">
                          {currentEvaluation.financialSnapshot.currentBudgetUtilizationPct}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full bg-indigo-600 rounded-full"
                          style={{
                            width: `${Math.min(
                              100,
                              currentEvaluation.financialSnapshot.currentBudgetUtilizationPct
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* AFTER CARD */}
                  <div className="p-4 rounded-xl bg-indigo-50/40 border border-indigo-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-950 uppercase tracking-wider">
                        After Purchase (Projected)
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-bold">
                        Simulated
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Projected Expenses:</span>
                        <span className="font-bold text-slate-900">
                          {formatCurrency(currentEvaluation.financialSnapshot.projectedMonthlyExpenses)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Projected Remaining Budget:</span>
                        <span
                          className={`font-bold ${
                            currentEvaluation.financialSnapshot.projectedRemainingBudget >= 0
                              ? 'text-emerald-600'
                              : 'text-rose-600'
                          }`}
                        >
                          {formatCurrency(currentEvaluation.financialSnapshot.projectedRemainingBudget)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Projected Net Savings:</span>
                        <span
                          className={`font-bold ${
                            currentEvaluation.financialSnapshot.projectedNetSavings >= 0
                              ? 'text-slate-900'
                              : 'text-rose-600'
                          }`}
                        >
                          {formatCurrency(currentEvaluation.financialSnapshot.projectedNetSavings)}
                        </span>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                        <span>Projected Utilization</span>
                        <span
                          className={`font-bold ${
                            currentEvaluation.financialSnapshot.projectedBudgetUtilizationPct > 90
                              ? 'text-rose-600'
                              : 'text-slate-900'
                          }`}
                        >
                          {currentEvaluation.financialSnapshot.projectedBudgetUtilizationPct}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            currentEvaluation.financialSnapshot.projectedBudgetUtilizationPct > 95
                              ? 'bg-rose-500'
                              : currentEvaluation.financialSnapshot.projectedBudgetUtilizationPct > 75
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{
                            width: `${Math.min(
                              100,
                              currentEvaluation.financialSnapshot.projectedBudgetUtilizationPct
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recharts Visual Comparison */}
                <div className="h-52 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparisonChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis
                        tickFormatter={(v) => `₹${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`}
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        formatter={(val) => [formatCurrency(val)]}
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          borderRadius: '12px',
                          border: '1px solid #e2e8f0',
                          fontSize: '12px',
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                      <Bar dataKey="Before" fill="#64748b" radius={[4, 4, 0, 0]} maxBarSize={45} />
                      <Bar dataKey="After" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={45} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Personalized AI Savings Plan Card */}
              {activePlan && (
                <div className="p-5 rounded-2xl bg-gradient-to-tr from-purple-50/60 via-white to-indigo-50/40 border border-purple-100 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-purple-100/80">
                    <div className="flex items-center space-x-2">
                      <div className="p-2 rounded-xl bg-purple-600 text-white shadow-xs">
                        <PiggyBank className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">Personalized AI Savings Plan</h3>
                        <p className="text-[11px] text-slate-500">
                          Structured roadmap to afford {currentEvaluation.productName} without financial strain
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-bold">
                      Goal: {formatCurrency(activePlan.targetAmount)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div className="p-3 rounded-xl bg-white border border-slate-100 shadow-2xs">
                      <span className="text-[10px] font-semibold text-slate-400 block uppercase">
                        Target Price
                      </span>
                      <span className="text-sm font-extrabold text-slate-900 mt-0.5 block">
                        {formatCurrency(activePlan.targetAmount)}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-white border border-slate-100 shadow-2xs">
                      <span className="text-[10px] font-semibold text-slate-400 block uppercase">
                        Estimated Months
                      </span>
                      <span className="text-sm font-extrabold text-indigo-600 mt-0.5 block">
                        {activePlan.estimatedMonths} Months
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-white border border-slate-100 shadow-2xs">
                      <span className="text-[10px] font-semibold text-slate-400 block uppercase">
                        Monthly Contribution
                      </span>
                      <span className="text-sm font-extrabold text-purple-600 mt-0.5 block">
                        {formatCurrency(activePlan.monthlySavingsRecommendation)}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-white border border-slate-100 shadow-2xs">
                      <span className="text-[10px] font-semibold text-slate-400 block uppercase">
                        Target Completion
                      </span>
                      <span className="text-sm font-extrabold text-emerald-600 mt-0.5 block">
                        {activePlan.estimatedCompletionDate}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                      <span>Fund Progress</span>
                      <span className="font-bold">
                        {formatCurrency(activePlan.amountSaved)} of {formatCurrency(activePlan.targetAmount)}
                      </span>
                    </div>
                    <div className="w-full bg-purple-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full"
                        style={{
                          width: `${Math.min(
                            100,
                            (activePlan.amountSaved / Math.max(1, activePlan.targetAmount)) * 100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Interactive Monthly Savings Slider/Adjuster */}
                  <div className="p-3 bg-white rounded-xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="font-bold text-slate-900 block">Customize Monthly Savings</span>
                      <span className="text-[11px] text-slate-400">
                        Adjust your monthly commitment to see timeline changes
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        step="500"
                        min="500"
                        placeholder={String(activePlan.monthlySavingsRecommendation)}
                        value={customMonthlySavings}
                        onChange={(e) => {
                          setCustomMonthlySavings(e.target.value);
                          handleRecalculatePlan(e.target.value);
                        }}
                        className="w-28 px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none font-bold text-slate-800"
                      />
                      <span className="text-[11px] text-slate-500">/ mo</span>
                    </div>
                  </div>

                  {/* Smart Tips */}
                  {activePlan.savingsTips?.length > 0 && (
                    <div className="space-y-1 text-[11px] text-slate-600 pt-1">
                      {activePlan.savingsTips.map((tip, idx) => (
                        <p key={idx} className="flex items-center space-x-1.5">
                          <span className="text-purple-600 font-bold">•</span>
                          <span>{tip}</span>
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Previous Evaluations History Table (Section 7) */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Purchase Evaluation History</h2>
            <p className="text-xs text-slate-400">Previous AI pre-purchase assessments and simulated decisions</p>
          </div>
          <span className="text-xs font-semibold text-slate-400">
            {history.length} evaluations recorded
          </span>
        </div>

        <div className="overflow-x-auto">
          {loadingHistory ? (
            <div className="p-8 text-center text-xs text-slate-400 animate-pulse">
              Loading purchase history...
            </div>
          ) : history.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No purchase evaluations yet. Enter an item in the form above to evaluate affordability.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-400 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 pl-4 pr-3 font-semibold">Product Name</th>
                  <th className="py-3 pr-3 font-semibold">Category</th>
                  <th className="py-3 pr-3 font-semibold">Priority</th>
                  <th className="py-3 pr-3 font-semibold">Evaluation Date</th>
                  <th className="py-3 pr-3 font-semibold text-center">Score</th>
                  <th className="py-3 pr-3 font-semibold">Decision</th>
                  <th className="py-3 pr-3 font-semibold text-right">Price</th>
                  <th className="py-3 pr-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((item) => {
                  const cfg = getDecisionConfig(item.decision);
                  return (
                    <tr key={item._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 pl-4 pr-3">
                        <p className="font-bold text-slate-900">{item.productName}</p>
                        <p className="text-[10px] text-slate-400">Method: {item.paymentMethod}</p>
                      </td>
                      <td className="py-3 pr-3">
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-100 text-slate-700">
                          {item.category || 'Shopping'}
                        </span>
                      </td>
                      <td className="py-3 pr-3 text-slate-600 font-medium">{item.purchasePriority}</td>
                      <td className="py-3 pr-3 text-slate-500">
                        {new Date(item.createdAt || item.purchaseDate).toLocaleDateString()}
                      </td>
                      <td className="py-3 pr-3 text-center">
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-extrabold"
                          style={{ color: cfg.accentColor, backgroundColor: `${cfg.accentColor}15` }}
                        >
                          {item.affordabilityScore}
                        </span>
                      </td>
                      <td className="py-3 pr-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg.badgeBg}`}
                        >
                          {item.decision}
                        </span>
                      </td>
                      <td className="py-3 pr-3 text-right font-bold text-slate-900">
                        {formatCurrency(item.price)}
                      </td>
                      <td className="py-3 pr-4 text-right space-x-1">
                        <button
                          type="button"
                          onClick={() => setCurrentEvaluation(item)}
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer text-[11px] font-semibold"
                          title="View Analysis"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(item._id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete Evaluation"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-100">
          <div className="w-full max-w-sm p-6 bg-white rounded-2xl shadow-xl border border-slate-100">
            <div className="flex items-center space-x-3 text-rose-600 mb-3">
              <div className="p-2 rounded-xl bg-rose-50">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Delete Evaluation?</h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Are you sure you want to delete this purchase evaluation record from your history?
            </p>
            <div className="flex items-center justify-end space-x-2 mt-5">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteEvaluation(deleteConfirmId)}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
