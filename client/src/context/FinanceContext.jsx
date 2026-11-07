import React, { createContext, useContext, useState } from 'react';
import { useAuth } from './AuthContext';

const FinanceContext = createContext();

export const FinanceProvider = ({ children }) => {
  const { user } = useAuth();
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
  const [isAddTxModalOpen, setIsAddTxModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const currencySymbol = user?.currency?.symbol || '₹';
  const currencyCode = user?.currency?.code || 'INR';

  const triggerRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const formatCurrency = (amount) => {
    const num = Number(amount) || 0;
    if (currencyCode === 'INR') {
      return `${currencySymbol}${num.toLocaleString('en-IN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      })}`;
    }
    return `${currencySymbol}${num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <FinanceContext.Provider
      value={{
        selectedMonth,
        setSelectedMonth,
        isAddTxModalOpen,
        setIsAddTxModalOpen,
        refreshKey,
        triggerRefresh,
        currencySymbol,
        currencyCode,
        formatCurrency,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => useContext(FinanceContext);
