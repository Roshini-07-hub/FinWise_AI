import axios from 'axios';

// If an external production API URL is set, use it; otherwise default to '/api' for same-origin serverless routing
const API_BASE = (import.meta.env.VITE_API_BASE && !import.meta.env.VITE_API_BASE.includes('localhost'))
  ? import.meta.env.VITE_API_BASE
  : '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('finwise_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// Response interceptor for session expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
        localStorage.removeItem('finwise_token');
        localStorage.removeItem('finwise_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth endpoints
export const authApi = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
};

// Transactions endpoints
export const transactionApi = {
  getAll: (params) => api.get('/transactions', { params }),
  getById: (id) => api.get(`/transactions/${id}`),
  create: (data) => api.post('/transactions', data),
  update: (id, data) => api.put(`/transactions/${id}`, data),
  delete: (id) => api.delete(`/transactions/${id}`),
  clearAll: () => api.delete('/transactions/clear-all'),
  autoCategorize: (data) => api.post('/transactions/auto-categorize', data),
};

// Receipts endpoints
export const receiptApi = {
  upload: (formData) => api.post('/receipts/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  confirm: (id, data) => api.post(`/receipts/${id}/confirm`, data),
  getAll: () => api.get('/receipts'),
  getById: (id) => api.get(`/receipts/${id}`),
  delete: (id) => api.delete(`/receipts/${id}`),
  clearAll: () => api.delete('/receipts/clear-all'),
};

// Budgets endpoints
export const budgetApi = {
  getOverview: (month) => api.get('/budgets/overview', { params: { month } }),
  setBudget: (data) => api.post('/budgets', data),
  deleteBudget: (id) => api.delete(`/budgets/${id}`),
};

// Analytics & Dashboard endpoints
export const analyticsApi = {
  getDashboard: (month) => api.get('/analytics/dashboard', { params: { month } }),
  getCharts: (params) => api.get('/analytics/charts', { params }),
  exportCsv: (params) => api.get('/analytics/export-csv', { params, responseType: 'blob' }),
};

// Product Intelligence endpoints
export const productApi = {
  getIntelligence: (params) => api.get('/products/intelligence', { params }),
  getById: (id) => api.get(`/products/${id}`),
  update: (id, data) => api.put(`/products/${id}`, data),
};

// AI Insights endpoints
export const insightApi = {
  getAll: (month) => api.get('/insights', { params: { month } }),
  refresh: (month) => api.post('/insights/refresh', { month }),
  dismiss: (id) => api.put(`/insights/${id}/dismiss`),
};

// AI Chatbot Assistant endpoints
export const chatApi = {
  sendMessage: (data) => api.post('/chat/message', data),
  getHistory: (sessionId) => api.get('/chat/history', { params: { sessionId } }),
  clearHistory: (sessionId) => api.delete('/chat/clear', { params: { sessionId } }),
};

// AI Before-You-Buy Assistant endpoints
export const purchaseAssistantApi = {
  analyze: (data) => api.post('/purchase-assistant/analyze', data),
  recalculateSavingsPlan: (data) => api.post('/purchase-assistant/savings-plan', data),
  getHistory: () => api.get('/purchase-assistant/history'),
  getById: (id) => api.get(`/purchase-assistant/history/${id}`),
  deleteEvaluation: (id) => api.delete(`/purchase-assistant/history/${id}`),
};

export default api;
