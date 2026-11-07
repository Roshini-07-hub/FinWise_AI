import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  CreditCard,
  Store,
  Tag,
  FileText,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { transactionApi } from '../services/api';

const PREDEFINED_CATEGORIES = [
  'Food & Dining',
  'Groceries',
  'Transportation',
  'Shopping',
  'Entertainment',
  'Healthcare',
  'Education',
  'Utilities',
  'Rent',
  'Travel',
  'Personal Care',
  'Subscriptions',
  'Salary',
  'Freelance Income',
  'Investment Income',
  'Other',
];

const PAYMENT_METHODS = [
  'UPI / GPay / PhonePe / Paytm',
  'Credit Card',
  'Debit Card',
  'Net Banking',
  'Cash',
  'Wallet',
  'Other',
];

export default function AddTransactionModal({ isOpen, onClose, onTransactionAdded }) {
  const { currencySymbol, triggerRefresh } = useFinance();

  const [type, setType] = useState('expense');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food & Dining');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('UPI / GPay / PhonePe / Paytm');
  const [merchant, setMerchant] = useState('');
  const [notes, setNotes] = useState('');

  // AI auto-categorization suggestion state
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [isAiCategorizing, setIsAiCategorizing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Debounced auto-categorize as user types title or merchant
  useEffect(() => {
    if (!title || title.trim().length < 3 || type === 'income') {
      setAiSuggestion(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsAiCategorizing(true);
        const res = await transactionApi.autoCategorize({
          title,
          amount: parseFloat(amount) || 0,
          merchant,
          notes,
        });
        if (res.data?.success && res.data.data) {
          setAiSuggestion(res.data.data);
          // Automatically set suggested category
          setCategory(res.data.data.category);
          if (res.data.data.merchant && !merchant) {
            setMerchant(res.data.data.merchant);
          }
        }
      } catch (err) {
        // Silently fail AI auto-categorization preview
      } finally {
        setIsAiCategorizing(false);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [title, merchant, type]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !amount || parseFloat(amount) <= 0) {
      setErrorMsg('Please specify a valid title and positive amount.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg('');

      const res = await transactionApi.create({
        title: title.trim(),
        amount: parseFloat(amount),
        type,
        category,
        date: date || new Date().toISOString().split('T')[0],
        paymentMethod,
        merchant: merchant.trim(),
        notes: notes.trim(),
      });

      triggerRefresh();
      if (onTransactionAdded) onTransactionAdded(res.data?.data);
      handleClose();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to save transaction.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setTitle('');
    setAmount('');
    setMerchant('');
    setNotes('');
    setAiSuggestion(null);
    setErrorMsg('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Add Transaction</h2>
              <p className="text-xs text-slate-500">Record income or expense with smart categorization</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
              {errorMsg}
            </div>
          )}

          {/* Type Selector (Income vs Expense) */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100/80 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setType('expense');
                if (category === 'Salary') setCategory('Food & Dining');
              }}
              className={`flex items-center justify-center space-x-2 py-2 rounded-lg text-xs font-bold transition-all ${
                type === 'expense'
                  ? 'bg-white text-rose-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Expense</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setType('income');
                setCategory('Salary');
              }}
              className={`flex items-center justify-center space-x-2 py-2 rounded-lg text-xs font-bold transition-all ${
                type === 'income'
                  ? 'bg-white text-emerald-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>Income</span>
            </button>
          </div>

          {/* Title & Amount Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Transaction Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Swiggy Lunch, Uber Ride"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Amount ({currencySymbol}) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                  {currencySymbol}
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-sm font-semibold bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Live AI Category Detection Suggestion Badge */}
          {isAiCategorizing ? (
            <div className="flex items-center space-x-2 text-xs text-indigo-600 bg-indigo-50/50 p-2 rounded-xl border border-indigo-100">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Analyzing merchant and auto-categorizing with Groq AI...</span>
            </div>
          ) : aiSuggestion ? (
            <div className="flex items-center justify-between text-xs bg-indigo-50/70 p-2.5 rounded-xl border border-indigo-100 text-indigo-900">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>
                  AI Suggestion: <strong>{aiSuggestion.category}</strong>
                  {aiSuggestion.merchant ? ` (${aiSuggestion.merchant})` : ''}
                </span>
              </div>
              <span className="text-[10px] bg-indigo-200/60 text-indigo-800 font-bold px-1.5 py-0.5 rounded">
                {(aiSuggestion.confidence * 100).toFixed(0)}% confidence
              </span>
            </div>
          ) : null}

          {/* Category & Payment Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs md:text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  {PREDEFINED_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs md:text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  {PAYMENT_METHODS.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Date & Merchant */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs md:text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Merchant / Store (Optional)
              </label>
              <div className="relative">
                <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="e.g. Swiggy, DMart, Amazon"
                  value={merchant}
                  onChange={(e) => setMerchant(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs md:text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Notes (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Team lunch reimbursement pending"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs md:text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center space-x-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-100 transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Transaction</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
