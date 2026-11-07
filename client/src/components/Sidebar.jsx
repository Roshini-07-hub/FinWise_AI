import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Receipt,
  FileUp,
  PieChart,
  BarChart3,
  Sparkles,
  Settings,
  LogOut,
  ShoppingBag,
  ShoppingCart,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { name: 'Overview', path: '/', icon: LayoutDashboard },
  { name: 'Transactions', path: '/transactions', icon: Receipt },
  { name: 'Upload Receipts', path: '/receipts', icon: FileUp, badge: 'AI OCR' },
  { name: 'Budgets', path: '/budgets', icon: PieChart },
  { name: 'Analytics', path: '/analytics', icon: BarChart3 },
  { name: 'Purchase Insights', path: '/products', icon: ShoppingBag, badge: 'Smart AI' },
  { name: 'Before You Buy', path: '/before-you-buy', icon: ShoppingCart, badge: 'New AI' },
  { name: 'AI Financial Assistant', path: '/assistant', icon: Sparkles, highlight: true },
  { name: 'Settings', path: '/settings', icon: Settings },
];

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col w-64 bg-white border-r border-slate-200/90 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-100 font-bold text-lg tracking-wider">
              FW
            </div>
            <div>
              <span className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                FinWise <span className="text-xs px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-semibold border border-indigo-100/80">AI</span>
              </span>
              <p className="text-[11px] text-slate-400 font-medium tracking-wide">FINANCIAL INTELLIGENCE</p>
            </div>
          </div>
        </div>

        {/* Navigation items */}
        <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            Menu
          </div>

          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-50/90 text-indigo-700 shadow-sm font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  } ${item.highlight ? 'relative group' : ''}`
                }
              >
                <div className="flex items-center space-x-3">
                  <Icon className="w-[18px] h-[18px] flex-shrink-0" />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 border border-indigo-200/50">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}

          {/* Prominent Sidebar Logout Action Button */}
          <div className="pt-2">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-all cursor-pointer"
            >
              <div className="flex items-center space-x-3">
                <LogOut className="w-[18px] h-[18px] flex-shrink-0 text-rose-500" />
                <span className="font-semibold">Logout</span>
              </div>
            </button>
          </div>
        </div>

        {/* User Profile Card & Sign Out Button at bottom */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/60 flex-shrink-0">
          <div className="p-2.5 rounded-xl bg-white border border-slate-200/70 shadow-2xs space-y-2">
            <div className="flex items-center space-x-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                {user?.name ? user.name.slice(0, 2).toUpperCase() : 'FW'}
              </div>
              <div className="truncate flex-1">
                <p className="text-xs font-semibold text-slate-800 truncate">{user?.name || 'FinWise User'}</p>
                <p className="text-[10px] text-slate-400 truncate">{user?.email || 'user@finwise.ai'}</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="w-full py-1.5 px-2.5 bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200/70 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
