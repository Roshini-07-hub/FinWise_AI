import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import AddTransactionModal from '../components/AddTransactionModal';
import { useFinance } from '../context/FinanceContext';

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isAddTxModalOpen, setIsAddTxModalOpen } = useFinance();

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex">
      {/* Sidebar Navigation */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* Top Navbar */}
        <Navbar onMenuClick={() => setSidebarOpen(true)} />

        {/* Page View Body */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </main>

        {/* Global Add Transaction Modal */}
        <AddTransactionModal
          isOpen={isAddTxModalOpen}
          onClose={() => setIsAddTxModalOpen(false)}
        />
      </div>
    </div>
  );
}
