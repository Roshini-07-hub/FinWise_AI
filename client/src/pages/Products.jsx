import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Sparkles,
  RefreshCw,
  Edit2,
  Calendar,
  Layers,
  ArrowRight,
  ChevronRight,
  TrendingUp,
  Tag,
  CheckCircle2,
  Package,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { productApi } from '../services/api';

export default function Products() {
  const { formatCurrency, refreshKey, triggerRefresh } = useFinance();

  const [timeFilter, setTimeFilter] = useState('this-month');
  const [viewMode, setViewMode] = useState('frequent'); // 'frequent' (2+ times) | 'all'
  const [intelligence, setIntelligence] = useState(null);
  const [loading, setLoading] = useState(true);

  // Edit product modal state for user correction
  const [editingProduct, setEditingProduct] = useState(null);
  const [editName, setEditName] = useState('');
  const [editBrand, setEditBrand] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editSubcategory, setEditSubcategory] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchIntelligence = async () => {
    try {
      setLoading(true);
      const res = await productApi.getIntelligence({ timeFilter });
      if (res.data?.success) {
        setIntelligence(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load product intelligence:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntelligence();
  }, [timeFilter, refreshKey]);

  const handleOpenEdit = (p) => {
    setEditingProduct(p);
    setEditName(p.name);
    setEditBrand(p.brand || '');
    setEditCategory(p.category || 'Groceries');
    setEditSubcategory(p.subcategory || 'General');
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!editingProduct) return;

    try {
      setIsUpdating(true);
      await productApi.update(editingProduct._id, {
        name: editName,
        brand: editBrand,
        category: editCategory,
        subcategory: editSubcategory,
      });

      setEditingProduct(null);
      triggerRefresh();
      fetchIntelligence();
    } catch (err) {
      console.error('Failed to update product details:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const frequentProducts = intelligence?.frequentProducts || [];
  const allProducts = intelligence?.allProducts || [];
  const displayedProducts = viewMode === 'frequent' ? frequentProducts : allProducts;
  const repeatInsights = intelligence?.repeatInsights || [];
  const spendingAnalysis = intelligence?.spendingAnalysis || [];
  const subcategoryStats = intelligence?.subcategoryStats || [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Purchase Intelligence</h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">
            AI-driven product detection, repeat item tracking, and grocery catalog insights
          </p>
        </div>

        {/* Time Filter Pills */}
        <div className="flex items-center space-x-1 p-1 bg-white border border-slate-200/80 rounded-xl shadow-2xs text-xs">
          {[
            { label: 'This Month', val: 'this-month' },
            { label: 'Last Month', val: 'last-month' },
            { label: 'Last 3M', val: 'last-3-months' },
            { label: 'All Time', val: 'all' },
          ].map((item) => (
            <button
              key={item.val}
              onClick={() => setTimeFilter(item.val)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                timeFilter === item.val
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Repeated Purchase Detection Callouts */}
      {repeatInsights.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {repeatInsights.map((ins, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50/90 via-white to-purple-50/50 border border-indigo-100 shadow-2xs flex items-start space-x-3"
            >
              <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs mt-0.5">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">
                  Repeated Purchase Pattern
                </span>
                <h4 className="text-xs md:text-sm font-bold text-slate-900 mt-0.5">{ins.title}</h4>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{ins.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Category Spending Trends */}
      {spendingAnalysis.length > 0 && (
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
          <span className="font-bold text-slate-900 uppercase tracking-wider text-[10px]">
            Spending Behavior Notes:
          </span>
          {spendingAnalysis.map((note, i) => (
            <p key={i} className="text-slate-600">
              • {note}
            </p>
          ))}
        </div>
      )}

      {/* Products Master Table with Frequently Purchased Filter */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              {viewMode === 'frequent' ? 'Frequently Purchased Products (2+ Purchases)' : 'All Tracked Products'}
            </h2>
            <p className="text-xs text-slate-400">
              {viewMode === 'frequent'
                ? 'Showing only repeatedly purchased items (purchased 2 or more times)'
                : 'All products aggregated across receipts and expense transactions'}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <div className="inline-flex p-1 bg-slate-100 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setViewMode('frequent')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'frequent'
                    ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Frequently Purchased ({frequentProducts.length})
              </button>
              <button
                type="button"
                onClick={() => setViewMode('all')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'all'
                    ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                All Products ({allProducts.length})
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400 animate-pulse">
              Loading purchase intelligence...
            </div>
          ) : displayedProducts.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 space-y-2">
              <p className="font-semibold text-slate-700">
                {viewMode === 'frequent'
                  ? 'No repeat purchases detected yet (items purchased 2 or more times will be highlighted here).'
                  : 'No product purchase records found.'}
              </p>
              {viewMode === 'frequent' && allProducts.length > 0 && (
                <button
                  type="button"
                  onClick={() => setViewMode('all')}
                  className="text-indigo-600 hover:text-indigo-800 font-semibold underline cursor-pointer"
                >
                  View all {allProducts.length} single purchases
                </button>
              )}
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-400 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 pl-4 pr-3 font-semibold">Normalized Product Name</th>
                  <th className="py-3 pr-3 font-semibold">Subcategory</th>
                  <th className="py-3 pr-3 font-semibold text-center">Frequency</th>
                  <th className="py-3 pr-3 font-semibold text-center">Qty Purchased</th>
                  <th className="py-3 pr-3 font-semibold text-right">Avg Unit Price</th>
                  <th className="py-3 pr-3 font-semibold text-right">Total Spent</th>
                  <th className="py-3 pr-3 font-semibold">Last Store</th>
                  <th className="py-3 pr-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedProducts.map((p) => (
                  <tr key={p._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 pl-4 pr-3">
                      <div className="flex items-center space-x-2.5">
                        <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 flex-shrink-0">
                          <Package className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{p.name}</p>
                          <p className="text-[10px] text-slate-400">
                            {p.brand ? `${p.brand} • ` : ''}
                            {p.sizeOrVariant ? `${p.sizeOrVariant} • ` : ''}
                            {p.aliases?.length ? `Aliases: ${p.aliases.slice(0, 2).join(', ')}` : ''}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 pr-3">
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-100 text-slate-700">
                        {p.subcategory || p.category || 'General'}
                      </span>
                    </td>

                    <td className="py-3 pr-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                          p.totalPurchasesCount >= 2
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {p.totalPurchasesCount}x
                      </span>
                    </td>

                    <td className="py-3 pr-3 text-center text-slate-600">
                      {p.totalQuantityPurchased}
                    </td>

                    <td className="py-3 pr-3 text-right text-slate-600">
                      {formatCurrency(p.averageUnitPrice)}
                    </td>

                    <td className="py-3 pr-3 text-right font-bold text-slate-900">
                      {formatCurrency(p.totalAmountSpent)}
                    </td>

                    <td className="py-3 pr-3 text-slate-500">{p.lastMerchant || 'Supermarket'}</td>

                    <td className="py-3 pr-4 text-right">
                      <button
                        onClick={() => handleOpenEdit(p)}
                        title="Correct product match or details"
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Edit Product Match Modal (Explicit Rule: Allow users to correct incorrect product matches) */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-100">
          <div className="w-full max-w-md p-6 bg-white rounded-2xl shadow-xl border border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Correct Product Classification</h3>
            <p className="text-xs text-slate-400 mb-4">
              Update canonical name, brand, or category mapping for future receipt matching
            </p>

            <form onSubmit={handleSaveProduct} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Product Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Brand</label>
                  <input
                    type="text"
                    value={editBrand}
                    onChange={(e) => setEditBrand(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Subcategory</label>
                  <input
                    type="text"
                    value={editSubcategory}
                    onChange={(e) => setEditSubcategory(e.target.value)}
                    placeholder="e.g. Dairy, Bakery"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  {isUpdating ? 'Saving...' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
