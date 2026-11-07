import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  User,
  Coins,
  ShieldCheck,
  CheckCircle2,
  Server,
  Sparkles,
  Database,
  Save,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFinance } from '../context/FinanceContext';
import { authApi } from '../services/api';

const SUPPORTED_CURRENCIES = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee (Default)' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
];

export default function Settings() {
  const { user, updateUserData } = useAuth();
  const { triggerRefresh } = useFinance();

  const [name, setName] = useState(user?.name || '');
  const [currencyCode, setCurrencyCode] = useState(user?.currency?.code || 'INR');
  const [monthlyBudgetGoal, setMonthlyBudgetGoal] = useState(user?.monthlyBudgetGoal || 50000);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      setErrorMsg('');
      setSuccessMsg('');

      const selectedCur = SUPPORTED_CURRENCIES.find((c) => c.code === currencyCode) || {
        code: 'INR',
        symbol: '₹',
      };

      const res = await authApi.updateProfile({
        name,
        currency: { code: selectedCur.code, symbol: selectedCur.symbol },
        monthlyBudgetGoal: parseFloat(monthlyBudgetGoal) || 50000,
      });

      if (res.data?.success) {
        updateUserData(res.data.data);
        triggerRefresh();
        setSuccessMsg('Profile and preferences updated successfully.');
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to update preferences.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Platform Settings</h1>
        <p className="text-xs md:text-sm text-slate-500 mt-0.5">
          Customize currency defaults, monthly targets, and inspect AI service integrations
        </p>
      </div>

      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl text-xs">
          {errorMsg}
        </div>
      )}

      {/* Profile & Currency Form */}
      <form onSubmit={handleSaveProfile} className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-5">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <User className="w-4 h-4 text-indigo-600" />
          User Profile & Preferences
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-xs md:text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Registered Email</label>
            <input
              type="email"
              disabled
              value={user?.email || ''}
              className="w-full px-3 py-2 text-xs md:text-sm bg-slate-100/70 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Default Currency Switcher */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Active Currency (Default: INR ₹)
            </label>
            <select
              value={currencyCode}
              onChange={(e) => setCurrencyCode(e.target.value)}
              className="w-full px-3 py-2 text-xs md:text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white font-medium"
            >
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} ({c.symbol}) - {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Monthly Budget Goal */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Default Monthly Budget Target
            </label>
            <input
              type="number"
              step="100"
              min="1000"
              required
              value={monthlyBudgetGoal}
              onChange={(e) => setMonthlyBudgetGoal(e.target.value)}
              className="w-full px-3 py-2 text-xs md:text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white font-semibold"
            />
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center space-x-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-100 transition-all cursor-pointer"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving Preferences...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save Settings</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Connected Services & Architecture Card */}
      <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Server className="w-4 h-4 text-indigo-600" />
          System & AI Engine Architecture
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-emerald-600" />
                MongoDB Atlas Structured Store
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                Active
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Transactions, categories, user profiles, budgets, and audit receipts stored in resilient MongoDB tables.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                Groq AI Llama-3.3 Engine
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-bold">
                Configured
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Structured JSON receipt parsing, product normalization, intelligent auto-categorization, and assistant reasoning.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-purple-600" />
                ChromaDB Vector Embeddings
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-bold">
                Connected
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Semantic product similarity matching, duplicate avoidance, and vector transaction search.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-amber-600" />
                Deterministic Rule Fallback
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
                Online
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              High-confidence deterministic merchant mapping rules for Swiggy, Uber, DMart, Blinkit, Amazon, etc.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
