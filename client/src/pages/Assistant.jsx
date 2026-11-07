import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Send,
  Trash2,
  Bot,
  User,
  ShieldCheck,
  Loader2,
  HelpCircle,
  TrendingDown,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { chatApi } from '../services/api';

const SUGGESTED_QUESTIONS = [
  'How much did I spend this month?',
  'What is my remaining monthly budget?',
  'How much did I spend on food & dining?',
  'What are my top five highest expenses?',
  'Which products do I purchase most frequently?',
  'Compare my spending this month with last month.',
  'How much did I save this month?',
  'How much did I spend on online shopping?',
];

export default function Assistant() {
  const { formatCurrency } = useFinance();
  const messagesEndRef = useRef(null);

  const [messages, setMessages] = useState([]);
  const [inputQuestion, setInputQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchChatHistory = async () => {
    try {
      setInitialLoading(true);
      const res = await chatApi.getHistory('default-session');
      if (res.data?.success && res.data.data) {
        setMessages(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch chat history:', err);
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    fetchChatHistory();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSendMessage = async (queryText) => {
    const text = queryText || inputQuestion;
    if (!text || !text.trim() || loading) return;

    const userMessage = {
      role: 'user',
      content: text.trim(),
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputQuestion('');
    setLoading(true);

    try {
      const res = await chatApi.sendMessage({
        question: text.trim(),
        sessionId: 'default-session',
      });

      if (res.data?.success && res.data.data) {
        setMessages((prev) => [...prev, res.data.data]);
      }
    } catch (err) {
      console.error('Chat error:', err);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error retrieving and calculating your financial data. Please ensure the backend is running.',
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = async () => {
    try {
      await chatApi.clearHistory('default-session');
      setMessages([]);
    } catch (err) {
      console.error('Failed to clear history:', err);
    }
  };

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-100">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              AI Financial Assistant
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                Verified Calculations
              </span>
            </h1>
            <p className="text-xs text-slate-500">
              Natural language intelligence powered strictly by verified database math
            </p>
          </div>
        </div>

        {messages.length > 0 && (
          <button
            onClick={handleClearHistory}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear History</span>
          </button>
        )}
      </div>

      {/* Chat Messages Body */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-y-auto p-4 md:p-6 space-y-4">
        {initialLoading ? (
          <div className="h-full flex items-center justify-center text-xs text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin mr-2 text-indigo-600" />
            Loading conversation...
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center max-w-lg mx-auto text-center space-y-4 p-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-xs">
              <Bot className="w-6 h-6" />
            </div>

            <div>
              <h2 className="text-base font-bold text-slate-900">How can I help you today?</h2>
              <p className="text-xs text-slate-500 mt-1">
                Ask any question about your spending habits, monthly budgets, frequently purchased products, or savings goals.
              </p>
            </div>

            {/* Suggested Question Chips */}
            <div className="w-full space-y-2 pt-2">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-left">
                Suggested Prompts:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                {SUGGESTED_QUESTIONS.slice(0, 6).map((q, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(q)}
                    className="p-2.5 text-xs text-slate-700 bg-slate-50 hover:bg-indigo-50/80 hover:text-indigo-700 hover:border-indigo-200 border border-slate-200/80 rounded-xl transition-all flex items-center justify-between text-left cursor-pointer"
                  >
                    <span className="truncate pr-1">{q}</span>
                    <ArrowRight className="w-3 h-3 text-slate-400 flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex items-start space-x-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-2xl rounded-2xl px-4 py-3 text-xs md:text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-none shadow-xs'
                    : 'bg-slate-50 text-slate-800 border border-slate-200/80 rounded-bl-none shadow-2xs'
                }`}
              >
                <div className="whitespace-pre-line">{msg.content}</div>
                <div
                  className={`text-[9px] mt-1.5 ${
                    msg.role === 'user' ? 'text-indigo-200 text-right' : 'text-slate-400'
                  }`}
                >
                  {msg.createdAt
                    ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : ''}
                </div>
              </div>

              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-xl bg-slate-800 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-xs">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))
        )}

        {loading && (
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl rounded-bl-none px-4 py-3 text-xs text-slate-500 flex items-center space-x-2">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
              <span>Querying database calculations & interpreting with Groq AI...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested chips row when conversation active */}
      {messages.length > 0 && (
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs">
          {SUGGESTED_QUESTIONS.slice(0, 4).map((q, i) => (
            <button
              key={i}
              onClick={() => handleSendMessage(q)}
              className="px-3 py-1 bg-white hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border border-slate-200 rounded-full text-[11px] font-medium text-slate-600 whitespace-nowrap shadow-2xs transition-all cursor-pointer"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input Form Bar */}
      <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="relative flex items-center">
        <input
          type="text"
          placeholder="Ask a question about your financial data, spending trends, or budget..."
          value={inputQuestion}
          onChange={(e) => setInputQuestion(e.target.value)}
          disabled={loading}
          className="w-full pl-4 pr-12 py-3 bg-white border border-slate-200/90 rounded-2xl text-xs md:text-sm shadow-2xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={!inputQuestion.trim() || loading}
          className="absolute right-2 p-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl shadow-xs transition-all cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
