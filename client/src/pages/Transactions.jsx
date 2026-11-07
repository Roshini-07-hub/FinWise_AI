import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Download,
  Plus,
  Trash2,
  Edit2,
  Receipt,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Calendar,
  X,
  FileSpreadsheet,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { transactionApi, analyticsApi } from '../services/api';

const CATEGORIES = [
  'All Categories',
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

export default function Transactions() {
  const { formatCurrency, setIsAddTxModalOpen, refreshKey, triggerRefresh } = useFinance();

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Filters & Search state
  const [search, setSearch] = useState('');
  const [semanticSearch, setSemanticSearch] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedSort, setSelectedSort] = useState('newest');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);

  // Edit modal state
  const [editingTx, setEditingTx] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [showClearAllModal, setShowClearAllModal] = useState(false);
  const [isClearingAll, setIsClearingAll] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 12,
        sort: selectedSort,
        search: search.trim() || undefined,
        semantic: semanticSearch,
        category: selectedCategory !== 'All Categories' ? selectedCategory : undefined,
        type: selectedType !== 'all' ? selectedType : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      };

      const res = await transactionApi.getAll(params);
      if (res.data?.success) {
        setTransactions(res.data.data);
        setTotalCount(res.data.pagination.total);
        setTotalPages(res.data.pagination.pages || 1);
      }
    } catch (err) {
      console.error('Error fetching transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [page, selectedSort, selectedCategory, selectedType, startDate, endDate, refreshKey]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchTransactions();
  };

  const handleDelete = async (id) => {
    try {
      await transactionApi.delete(id);
      setDeleteConfirmId(null);
      triggerRefresh();
      fetchTransactions();
    } catch (err) {
      console.error('Failed to delete transaction:', err);
    }
  };

  const handleClearAllHistory = async () => {
    try {
      setIsClearingAll(true);
      await transactionApi.clearAll();
      setShowClearAllModal(false);
      setTransactions([]);
      setTotalCount(0);
      setTotalPages(1);
      triggerRefresh();
      fetchTransactions();
    } catch (err) {
      console.error('Failed to clear all history:', err);
    } finally {
      setIsClearingAll(false);
    }
  };

  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      const res = await analyticsApi.exportCsv({
        category: selectedCategory !== 'All Categories' ? selectedCategory : undefined,
        type: selectedType !== 'all' ? selectedType : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });

      // Trigger browser download
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `finwise-transactions-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Failed to export CSV:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingTx) return;

    try {
      await transactionApi.update(editingTx._id, {
        title: editingTx.title,
        amount: parseFloat(editingTx.amount),
        type: editingTx.type,
        category: editingTx.category,
        date: editingTx.date,
        paymentMethod: editingTx.paymentMethod,
        merchant: editingTx.merchant,
        notes: editingTx.notes,
      });

      setEditingTx(null);
      triggerRefresh();
      fetchTransactions();
    } catch (err) {
      console.error('Error saving edited transaction:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Transactions</h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">
            Manage, filter, and export verified financial records ({totalCount} entries)
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowClearAllModal(true)}
            className="flex items-center space-x-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100/80 text-rose-700 border border-rose-200/80 rounded-xl text-xs font-semibold shadow-2xs transition-all cursor-pointer"
            title="Remove all transactions and history"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
            <span>Clear All History</span>
          </button>

          <button
            onClick={handleExportCsv}
            disabled={isExporting}
            className="flex items-center space-x-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-2xs transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>{isExporting ? 'Exporting...' : 'Export CSV'}</span>
          </button>

          <button
            onClick={() => setIsAddTxModalOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-indigo-100 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Transaction</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar Card */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search Input with Semantic Search Toggle */}
          <div className="md:col-span-2">
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder={semanticSearch ? "AI vector search (e.g. coffee, fuel, food orders)..." : "Search by title, merchant, notes..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-24 py-2 text-xs md:text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={() => setSemanticSearch(!semanticSearch)}
                className={`absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 rounded-lg text-[10px] font-bold flex items-center space-x-1 transition-all ${
                  semanticSearch
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                }`}
                title="Toggle AI Semantic Search"
              >
                <Sparkles className="w-3 h-3" />
                <span>Vector AI</span>
              </button>
            </form>
          </div>

          {/* Category Dropdown */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs md:text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium text-slate-700"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By Dropdown */}
          <div>
            <select
              value={selectedSort}
              onChange={(e) => {
                setSelectedSort(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs md:text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium text-slate-700"
            >
              <option value="newest">Sort: Newest First</option>
              <option value="oldest">Sort: Oldest First</option>
              <option value="highest">Sort: Highest Amount</option>
              <option value="lowest">Sort: Lowest Amount</option>
            </select>
          </div>
        </div>

        {/* Secondary Filters: Type & Date Range */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
          {/* Type Pills */}
          <div className="flex items-center space-x-1">
            <span className="text-slate-400 font-medium mr-1">Type:</span>
            {['all', 'expense', 'income'].map((t) => (
              <button
                key={t}
                onClick={() => {
                  setSelectedType(t);
                  setPage(1);
                }}
                className={`px-3 py-1 rounded-lg font-semibold uppercase text-[10px] tracking-wider transition-all ${
                  selectedType === t
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold'
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Date Range Inputs */}
          <div className="flex items-center space-x-2">
            <span className="text-slate-400 font-medium">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none text-slate-700"
            />
            <span className="text-slate-400 font-medium">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none text-slate-700"
            />
            {(startDate || endDate || search || selectedCategory !== 'All Categories' || selectedType !== 'all') && (
              <button
                onClick={() => {
                  setSearch('');
                  setSelectedCategory('All Categories');
                  setSelectedType('all');
                  setStartDate('');
                  setEndDate('');
                  setPage(1);
                }}
                className="text-[11px] text-rose-600 hover:underline font-semibold ml-1 cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="rounded-2xl bg-white border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400 animate-pulse">
              Loading transactions...
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400 space-y-2">
              <p className="font-semibold text-slate-600">No matching transactions found.</p>
              <p>Try clearing your filters or create a new transaction.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-400 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 pl-6 pr-3 font-semibold">Title / Merchant</th>
                  <th className="py-3.5 pr-3 font-semibold">Category</th>
                  <th className="py-3.5 pr-3 font-semibold">Date</th>
                  <th className="py-3.5 pr-3 font-semibold">Payment</th>
                  <th className="py-3.5 pr-3 font-semibold">Method</th>
                  <th className="py-3.5 pr-3 font-semibold text-right">Amount</th>
                  <th className="py-3.5 pr-6 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((tx) => (
                  <tr key={tx._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 pl-6 pr-3">
                      <div className="flex items-center space-x-3">
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
                                <Receipt className="w-3.5 h-3.5" />
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {tx.merchant ? tx.merchant : 'No merchant specified'}
                            {tx.notes ? ` • ${tx.notes}` : ''}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 pr-3">
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-100 text-slate-700">
                        {tx.category}
                      </span>
                    </td>

                    <td className="py-3.5 pr-3 text-slate-500 whitespace-nowrap">
                      {new Date(tx.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>

                    <td className="py-3.5 pr-3 text-slate-500">{tx.paymentMethod}</td>

                    <td className="py-3.5 pr-3">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-semibold uppercase">
                        {tx.categorizationMethod || 'manual'}
                      </span>
                    </td>

                    <td
                      className={`py-3.5 pr-3 text-right font-bold text-sm whitespace-nowrap ${
                        tx.type === 'income' ? 'text-emerald-600' : 'text-slate-900'
                      }`}
                    >
                      {tx.type === 'income' ? '+' : '-'}
                      {formatCurrency(tx.amount)}
                    </td>

                    <td className="py-3.5 pr-6 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          onClick={() => setEditingTx(tx)}
                          title="Edit transaction"
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(tx._id)}
                          title="Delete transaction"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-500">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center space-x-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Clear All History Confirmation Dialog */}
      {showClearAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-100">
          <div className="w-full max-w-sm p-6 bg-white rounded-2xl shadow-xl border border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Remove All Previous History?</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              This will permanently delete all previous transactions, receipts, product purchase history, and reset your ledger to a completely fresh clean slate.
            </p>
            <div className="flex items-center justify-end space-x-2 mt-5">
              <button
                type="button"
                onClick={() => setShowClearAllModal(false)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isClearingAll}
                onClick={handleClearAllHistory}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-xl shadow-xs cursor-pointer"
              >
                {isClearingAll ? 'Clearing...' : 'Yes, Remove All History'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-100">
          <div className="w-full max-w-sm p-6 bg-white rounded-2xl shadow-xl border border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Delete Transaction?</h3>
            <p className="text-xs text-slate-500 mt-1">
              This action cannot be undone. Are you sure you want to permanently delete this record?
            </p>
            <div className="flex items-center justify-end space-x-2 mt-5">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Transaction Modal */}
      {editingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Edit Transaction</h3>
              <button
                onClick={() => setEditingTx(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={editingTx.title}
                  onChange={(e) => setEditingTx({ ...editingTx, title: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editingTx.amount}
                    onChange={(e) => setEditingTx({ ...editingTx, amount: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={editingTx.category}
                    onChange={(e) => setEditingTx({ ...editingTx, category: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  >
                    {CATEGORIES.filter((c) => c !== 'All Categories').map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Merchant</label>
                  <input
                    type="text"
                    value={editingTx.merchant || ''}
                    onChange={(e) => setEditingTx({ ...editingTx, merchant: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={editingTx.date ? new Date(editingTx.date).toISOString().split('T')[0] : ''}
                    onChange={(e) => setEditingTx({ ...editingTx, date: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes</label>
                <input
                  type="text"
                  value={editingTx.notes || ''}
                  onChange={(e) => setEditingTx({ ...editingTx, notes: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingTx(null)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
