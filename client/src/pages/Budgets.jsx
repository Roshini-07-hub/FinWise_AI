import React, { useState, useEffect } from 'react';
import {
  Target,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Edit2,
  Info,
  Calendar,
  Layers,
  ArrowRight,
  TrendingDown,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { budgetApi } from '../services/api';

const CATEGORIES = [
  'Food & Dining',
  'Groceries',
  'Transportation',
  'Shopping',
  'Entertainment',
  'Healthcare',
  'Utilities',
  'Personal Care',
  'Subscriptions',
  'Other',
];

export default function Budgets() {
  const { selectedMonth, formatCurrency, refreshKey, triggerRefresh } = useFinance();

  const [loading, setLoading] = useState(true);
  const [budgetOverview, setBudgetOverview] = useState(null);

  // Modal state for setting total or category budget
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalCategory, setModalCategory] = useState('TOTAL');
  const [modalAmount, setModalAmount] = useState('');
  const [modalNotes, setModalNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const fetchBudgets = async () => {
    try {
      setLoading(true);
      const res = await budgetApi.getOverview(selectedMonth);
      if (res.data?.success) {
        setBudgetOverview(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load budgets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBudgets();
  }, [selectedMonth, refreshKey]);

  const handleOpenModal = (category = 'TOTAL', currentAmount = '') => {
    setModalCategory(category);
    setModalAmount(currentAmount ? String(currentAmount) : '');
    setModalNotes('');
    setIsModalOpen(true);
  };

  const handleSaveBudget = async (e) => {
    e.preventDefault();
    if (!modalAmount || parseFloat(modalAmount) <= 0) return;

    try {
      setIsSaving(true);
      await budgetApi.setBudget({
        month: selectedMonth,
        category: modalCategory,
        amount: parseFloat(modalAmount),
        notes: modalNotes,
      });

      setIsModalOpen(false);
      triggerRefresh();
      fetchBudgets();
    } catch (err) {
      console.error('Failed to save budget:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteBudget = async (id) => {
    if (!id) return;
    try {
      await budgetApi.deleteBudget(id);
      triggerRefresh();
      fetchBudgets();
    } catch (err) {
      console.error('Failed to delete budget:', err);
    }
  };

  const overall = budgetOverview?.overall || { budget: 0, spent: 0, remaining: 0, percentage: 0, status: 'normal' };
  const categoryBudgets = budgetOverview?.categoryBudgets || [];
  const notifications = budgetOverview?.notifications || [];

  // Color helper for progress bars
  const getProgressBarStyles = (pct) => {
    if (pct >= 90) return { bar: 'bg-rose-500', text: 'text-rose-700 bg-rose-50 border-rose-200' };
    if (pct >= 70) return { bar: 'bg-amber-500', text: 'text-amber-700 bg-amber-50 border-amber-200' };
    return { bar: 'bg-emerald-500', text: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Monthly Budget Management</h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">
            Set spending limits for {selectedMonth} and monitor thresholds dynamically
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleOpenModal('TOTAL', overall.budget)}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold rounded-xl shadow-2xs transition-colors cursor-pointer"
          >
            Edit Overall Budget
          </button>
          <button
            onClick={() => handleOpenModal('Food & Dining', '')}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-indigo-100 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Category Budget</span>
          </button>
        </div>
      </div>

      {/* Threshold Alert Banners (70%, 90%, Exceeded) */}
      {notifications.length > 0 && (
        <div className="space-y-2">
          {notifications.map((notif, idx) => (
            <div
              key={idx}
              className={`p-3.5 rounded-xl border text-xs flex items-center space-x-2.5 ${
                notif.type === 'danger'
                  ? 'bg-rose-50/80 border-rose-200 text-rose-800'
                  : notif.type === 'warning'
                  ? 'bg-amber-50/80 border-amber-200 text-amber-800'
                  : 'bg-indigo-50/80 border-indigo-200 text-indigo-800'
              }`}
            >
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span className="font-medium">{notif.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Total Monthly Budget Master Card */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Overall Monthly Budget</span>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-3xl font-extrabold text-slate-900">{formatCurrency(overall.budget)}</span>
              <span className="text-xs text-slate-400 font-medium">allocated for {selectedMonth}</span>
            </div>
          </div>

          <div className="flex items-center space-x-4 text-right">
            <div>
              <p className="text-xs text-slate-400">Total Spent</p>
              <p className="text-sm font-bold text-slate-800">{formatCurrency(overall.spent)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Remaining</p>
              <p className="text-sm font-bold text-indigo-600">{formatCurrency(overall.remaining)}</p>
            </div>
            <div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getProgressBarStyles(overall.percentage).text}`}>
                {overall.percentage}% used
              </span>
            </div>
          </div>
        </div>

        {/* Dynamic Progress Bar */}
        <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full ${getProgressBarStyles(overall.percentage).bar} transition-all duration-500 rounded-full`}
            style={{ width: `${Math.min(100, overall.percentage)}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
          <span>0%</span>
          <span>70% threshold</span>
          <span>90% critical</span>
          <span>100% budget limit</span>
        </div>
      </div>

      {/* Category Budgets Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-900">Category Budgets</h2>
          <span className="text-xs text-slate-400 font-medium">{categoryBudgets.length} configured</span>
        </div>

        {categoryBudgets.length === 0 ? (
          <div className="p-8 rounded-2xl bg-white border border-slate-200/80 text-center text-xs text-slate-400 space-y-2">
            <p className="font-semibold text-slate-700">No individual category budgets configured yet.</p>
            <p>Click "Add Category Budget" to set limits for Food & Dining, Groceries, Shopping, etc.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categoryBudgets.map((cb) => {
              const styles = getProgressBarStyles(cb.percentage);
              return (
                <div
                  key={cb._id}
                  className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs card-hover flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{cb.category}</h3>
                      {cb.notes && <p className="text-[11px] text-slate-400 mt-0.5">{cb.notes}</p>}
                    </div>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${styles.text}`}>
                      {cb.percentage}%
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-slate-500">
                        Spent: <strong>{formatCurrency(cb.spent)}</strong>
                      </span>
                      <span className="text-slate-500">
                        Budget: <strong>{formatCurrency(cb.amount)}</strong>
                      </span>
                    </div>

                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${styles.bar} transition-all duration-300 rounded-full`}
                        style={{ width: `${Math.min(100, cb.percentage)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                      <span>Left: {formatCurrency(cb.remaining)}</span>
                      {cb.percentage >= 100 && (
                        <span className="text-rose-600 font-bold">Overspent!</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-end space-x-1 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => handleOpenModal(cb.category, cb.amount)}
                      title="Edit budget"
                      className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteBudget(cb._id)}
                      title="Delete budget"
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 9 Explanatory Banner: Refund & Reimbursement Policy */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start space-x-3">
        <Info className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-bold text-slate-900">How Refunds & Reimbursements Affect Spending</h4>
          <p className="mt-0.5 leading-relaxed">
            Eligible expense calculations strictly reflect outbound transactions. Any cash refunds, payroll credits, or company reimbursements are tracked under Income, preserving clean budget allocations without falsely deflating true lifestyle spending categories.
          </p>
        </div>
      </div>

      {/* Add / Edit Budget Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-100">
          <div className="w-full max-w-md p-6 bg-white rounded-2xl shadow-xl border border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              {modalCategory === 'TOTAL' ? 'Set Total Monthly Budget' : `Set ${modalCategory} Budget`}
            </h3>
            <p className="text-xs text-slate-500 mb-4">Target for {selectedMonth}</p>

            <form onSubmit={handleSaveBudget} className="space-y-3 text-xs">
              {modalCategory !== 'TOTAL' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={modalCategory}
                    onChange={(e) => setModalCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Budget Limit Amount (₹) *</label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  required
                  placeholder="e.g. 15000"
                  value={modalAmount}
                  onChange={(e) => setModalAmount(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-bold bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Limit dining delivery to 3x a week"
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-xs"
                >
                  {isSaving ? 'Saving...' : 'Set Budget'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
