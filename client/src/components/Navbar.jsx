import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menu,
  Search,
  Calendar,
  Bell,
  Plus,
  ChevronDown,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  X,
  LogOut,
  Settings,
  User,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFinance } from '../context/FinanceContext';
import { budgetApi, insightApi } from '../services/api';

export default function Navbar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const { selectedMonth, setSelectedMonth, setIsAddTxModalOpen, refreshKey } = useFinance();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Generate available months for selector (last 12 months)
  const monthOptions = [];
  const curr = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(curr.getFullYear(), curr.getMonth() - i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    monthOptions.push({ val, label });
  }

  // Load live notifications (budget warnings + AI insights)
  useEffect(() => {
    const loadAlerts = async () => {
      try {
        const [budgetRes, insightRes] = await Promise.all([
          budgetApi.getOverview(selectedMonth).catch(() => ({ data: { data: { notifications: [] } } })),
          insightApi.getAll(selectedMonth).catch(() => ({ data: { data: [] } })),
        ]);

        const list = [];
        if (budgetRes.data?.data?.notifications) {
          for (const n of budgetRes.data.data.notifications) {
            list.push({
              id: `budget-${n.category}-${n.type}`,
              type: n.type,
              title: n.category,
              message: n.message,
              time: 'Current Month',
            });
          }
        }
        if (insightRes.data?.data) {
          for (const ins of insightRes.data.data.slice(0, 3)) {
            list.push({
              id: ins._id,
              type: ins.type,
              title: ins.title,
              message: ins.message,
              time: 'AI Insight',
            });
          }
        }
        setNotifications(list);
        setUnreadCount(list.length);
      } catch (err) {
        console.error('Error fetching navbar alerts:', err);
      }
    };

    loadAlerts();
  }, [selectedMonth, refreshKey]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/transactions?search=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 md:px-8 bg-white/80 backdrop-blur-md border-b border-slate-200/80">
      {/* Left: Mobile hamburger & Search bar */}
      <div className="flex items-center space-x-3 flex-1 max-w-md">
        <button
          onClick={onMenuClick}
          className="p-2 text-slate-500 hover:text-slate-900 rounded-lg lg:hidden hover:bg-slate-100 transition-colors"
          aria-label="Toggle navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <form onSubmit={handleSearchSubmit} className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search transactions, merchants, categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs md:text-sm bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-xl transition-all outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 placeholder:text-slate-400"
          />
        </form>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-2 md:space-x-3">
        {/* Month Selector */}
        <div className="relative">
          <div className="flex items-center space-x-1 px-3 py-1.5 bg-slate-100/80 hover:bg-slate-100 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer transition-colors">
            <Calendar className="w-3.5 h-3.5 text-indigo-600 mr-1" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-800 outline-none cursor-pointer pr-1"
            >
              {monthOptions.map((opt) => (
                <option key={opt.val} value={opt.val}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title="Notifications & Insights"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex items-center justify-center w-4 h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/70">
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-sm text-slate-900">Notifications & Alerts</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-bold">
                    {notifications.length}
                  </span>
                </div>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500/70" />
                    All financial indicators normal. No active alerts.
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div key={n.id} className="p-3.5 hover:bg-slate-50/80 transition-colors">
                      <div className="flex items-start space-x-2.5">
                        {n.type === 'danger' || n.type === 'warning' ? (
                          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                        ) : (
                          <Sparkles className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                        )}
                        <div>
                          <p className="text-xs font-semibold text-slate-800">{n.title}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{n.message}</p>
                          <span className="text-[10px] text-slate-400 mt-1 inline-block">{n.time}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Quick Add Transaction Button */}
        <button
          onClick={() => setIsAddTxModalOpen(true)}
          className="flex items-center space-x-1.5 px-3 md:px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white rounded-xl text-xs md:text-sm font-semibold shadow-sm shadow-indigo-200 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add Transaction</span>
          <span className="sm:hidden">Add</span>
        </button>

        {/* User Profile Avatar & Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center space-x-1.5 p-1 rounded-full hover:ring-2 hover:ring-indigo-100 transition-all cursor-pointer"
            title="User Account Menu"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-900 to-slate-700 text-white flex items-center justify-center text-xs font-bold ring-2 ring-slate-100">
              {user?.name ? user.name.slice(0, 2).toUpperCase() : 'FW'}
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
              {/* User Info Header */}
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/70">
                <p className="text-xs font-bold text-slate-900 truncate">{user?.name || 'User'}</p>
                <p className="text-[11px] text-slate-500 truncate">{user?.email || 'user@finwise.ai'}</p>
              </div>

              {/* Menu Links */}
              <div className="p-1 space-y-0.5 text-xs">
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    navigate('/settings');
                  }}
                  className="w-full flex items-center space-x-2.5 px-3 py-2 text-slate-700 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer text-left"
                >
                  <Settings className="w-4 h-4 text-slate-400" />
                  <span>Account Settings</span>
                </button>

                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    logout();
                    navigate('/login');
                  }}
                  className="w-full flex items-center space-x-2.5 px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer text-left font-semibold"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
