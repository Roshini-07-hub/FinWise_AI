import React, { useState, useEffect, useRef } from 'react';
import {
  FileUp,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Eye,
  Plus,
  Trash2,
  Calendar,
  Store,
  CreditCard,
  Tag,
  Loader2,
  FileText,
  Receipt as ReceiptIcon,
  ChevronRight,
  Info,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { receiptApi } from '../services/api';

const PREDEFINED_CATEGORIES = [
  'Groceries',
  'Food & Dining',
  'Shopping',
  'Healthcare',
  'Utilities',
  'Transportation',
  'Personal Care',
  'Entertainment',
  'Other',
];

export default function Receipts() {
  const { formatCurrency, triggerRefresh } = useFinance();
  const fileInputRef = useRef(null);

  const [receiptsList, setReceiptsList] = useState([]);
  const [loadingList, setLoadingList] = useState(true);

  // Upload & Extraction workflow state
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [ocrStep, setOcrStep] = useState(''); // 'uploading' | 'ocr' | 'ai'

  // Active extracted receipt awaiting user confirmation
  const [activeReceiptId, setActiveReceiptId] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmSuccess, setConfirmSuccess] = useState(false);

  // Delete & Clear history states
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [showClearAllModal, setShowClearAllModal] = useState(false);
  const [isClearingAll, setIsClearingAll] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch previous receipts
  const fetchReceipts = async () => {
    try {
      setLoadingList(true);
      const res = await receiptApi.getAll();
      if (res.data?.success) {
        setReceiptsList(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load receipts list:', err);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchReceipts();
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File size exceeds 10MB limit. Please upload a smaller receipt image or PDF.');
      return;
    }

    // Validate format
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      setUploadError('Unsupported format. Please upload JPG, PNG, WEBP, or PDF.');
      return;
    }

    setUploadError('');
    setSelectedFile(file);

    if (file.type.startsWith('image/')) {
      setFilePreviewUrl(URL.createObjectURL(file));
    } else {
      setFilePreviewUrl(null);
    }
  };

  const handleStartOcr = async () => {
    if (!selectedFile) return;

    try {
      setIsUploading(true);
      setUploadError('');
      setConfirmSuccess(false);
      setOcrStep('Extracting text using OCR and Groq AI intelligence...');

      const formData = new FormData();
      formData.append('receipt', selectedFile);

      const res = await receiptApi.upload(formData);
      if (res.data?.success) {
        const payload = res.data.data;
        setActiveReceiptId(payload.receiptId);
        setExtractedData(payload.extracted);
        if (!filePreviewUrl && payload.fileUrl) {
          setFilePreviewUrl(payload.fileUrl);
        }
      }
    } catch (err) {
      console.error('Receipt upload failed:', err);
      setUploadError(err.response?.data?.message || 'Receipt OCR analysis failed. Please try again.');
    } finally {
      setIsUploading(false);
      setOcrStep('');
    }
  };

  // Add line item manually
  const handleAddLineItem = () => {
    if (!extractedData) return;
    setExtractedData({
      ...extractedData,
      items: [
        ...extractedData.items,
        { productName: '', quantity: 1, unitPrice: 0, totalPrice: 0, discount: 0 },
      ],
    });
  };

  // Update line item
  const handleUpdateLineItem = (index, field, value) => {
    const updatedItems = [...extractedData.items];
    updatedItems[index][field] = value;

    // Auto-calculate totalPrice if qty or unitPrice changed
    if (field === 'quantity' || field === 'unitPrice') {
      const q = parseFloat(updatedItems[index].quantity) || 1;
      const u = parseFloat(updatedItems[index].unitPrice) || 0;
      updatedItems[index].totalPrice = Number((q * u).toFixed(2));
    }

    // Recalculate total
    const newTotal = updatedItems.reduce((acc, curr) => acc + (parseFloat(curr.totalPrice) || 0), 0);

    setExtractedData({
      ...extractedData,
      items: updatedItems,
      totalAmount: newTotal > 0 ? Number(newTotal.toFixed(2)) : extractedData.totalAmount,
    });
  };

  // Delete line item
  const handleDeleteLineItem = (index) => {
    const updatedItems = extractedData.items.filter((_, i) => i !== index);
    const newTotal = updatedItems.reduce((acc, curr) => acc + (parseFloat(curr.totalPrice) || 0), 0);
    setExtractedData({
      ...extractedData,
      items: updatedItems,
      totalAmount: newTotal > 0 ? Number(newTotal.toFixed(2)) : extractedData.totalAmount,
    });
  };

  // Save confirmed transaction into MongoDB Atlas & update product intelligence
  const handleConfirmAndSave = async (e) => {
    e.preventDefault();
    if (!activeReceiptId || !extractedData) return;

    try {
      setIsConfirming(true);
      setUploadError('');

      await receiptApi.confirm(activeReceiptId, {
        merchant: extractedData.merchant,
        billNumber: extractedData.billNumber,
        purchaseDate: extractedData.purchaseDate,
        totalAmount: parseFloat(extractedData.totalAmount) || 0,
        category: extractedData.suggestedCategory || 'Groceries',
        paymentMethod: extractedData.paymentMethod || 'UPI / GPay / PhonePe / Paytm',
        notes: `Bill #${extractedData.billNumber || 'N/A'} - ${extractedData.items?.length || 0} line items`,
        items: extractedData.items || [],
      });

      setConfirmSuccess(true);
      triggerRefresh();
      fetchReceipts();

      // Reset active form after 2 seconds
      setTimeout(() => {
        setSelectedFile(null);
        setFilePreviewUrl(null);
        setActiveReceiptId(null);
        setExtractedData(null);
        setConfirmSuccess(false);
      }, 2500);
    } catch (err) {
      console.error('Confirmation failed:', err);
      setUploadError(err.response?.data?.message || 'Failed to save confirmed transaction.');
    } finally {
      setIsConfirming(false);
    }
  };

  // Discard & delete currently active pending receipt
  const handleDiscardActiveReceipt = async () => {
    if (!activeReceiptId) {
      setExtractedData(null);
      setSelectedFile(null);
      setFilePreviewUrl(null);
      return;
    }

    try {
      setIsDeleting(true);
      await receiptApi.delete(activeReceiptId);
      setExtractedData(null);
      setSelectedFile(null);
      setFilePreviewUrl(null);
      setActiveReceiptId(null);
      fetchReceipts();
      triggerRefresh();
    } catch (err) {
      console.error('Failed to discard receipt:', err);
      // Fallback clean local view even if delete API errored
      setExtractedData(null);
      setSelectedFile(null);
      setFilePreviewUrl(null);
      setActiveReceiptId(null);
    } finally {
      setIsDeleting(false);
    }
  };

  // Delete confirmed receipt from history
  const handleDeleteReceipt = async (id) => {
    if (!id) return;
    try {
      await receiptApi.delete(id);
      setDeleteConfirmId(null);
      fetchReceipts();
      triggerRefresh();
    } catch (err) {
      console.error('Failed to delete receipt:', err);
    }
  };

  // Clear all receipts history
  const handleClearAllReceipts = async () => {
    try {
      setIsClearingAll(true);
      await receiptApi.clearAll();
      setShowClearAllModal(false);
      fetchReceipts();
      triggerRefresh();
    } catch (err) {
      console.error('Failed to clear receipt history:', err);
    } finally {
      setIsClearingAll(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Receipt & Bill AI OCR</h1>
        <p className="text-xs md:text-sm text-slate-500 mt-0.5">
          Upload supermarket bills, restaurant receipts, and invoices. AI automatically extracts line items and feeds product intelligence.
        </p>
      </div>

      {/* Upload Zone (when no active extracted data) */}
      {!extractedData && (
        <div className="p-8 rounded-2xl bg-white border-2 border-dashed border-slate-200 hover:border-indigo-400 text-center transition-all">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".jpg,.jpeg,.png,.webp,.pdf"
            className="hidden"
          />

          <div className="max-w-md mx-auto space-y-3">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-xs">
              <FileUp className="w-7 h-7" />
            </div>

            <div>
              <p className="text-sm font-bold text-slate-800">
                {selectedFile ? selectedFile.name : 'Select or drop your receipt file'}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Supports JPG, PNG, WEBP, and PDF documents up to 10MB
              </p>
            </div>

            {uploadError && (
              <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
                {uploadError}
              </div>
            )}

            <div className="flex items-center justify-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl shadow-2xs transition-colors cursor-pointer"
              >
                Choose File
              </button>

              {selectedFile && (
                <button
                  type="button"
                  onClick={handleStartOcr}
                  disabled={isUploading}
                  className="flex items-center space-x-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-100 transition-all cursor-pointer"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{ocrStep || 'Analyzing receipt...'}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Scan & Extract with AI</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Split Preview & Verification Screen (Rule: User must review and confirm!) */}
      {extractedData && (
        <div className="space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs flex items-center space-x-2">
            <Info className="w-4 h-4 flex-shrink-0 text-amber-600" />
            <span>
              <strong>Review Extracted Details:</strong> Please verify the OCR information, modify line items if necessary, and click "Confirm & Save Transaction" to log it into MongoDB Atlas and Smart Product Intelligence.
            </span>
          </div>

          {confirmSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-center space-x-2 animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <span>
                <strong>Verified & Saved Successfully!</strong> Confirmed transaction has been recorded and products added to your spending catalog.
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Receipt Preview Panel */}
            <div className="lg:col-span-5 p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-indigo-600" />
                  Receipt Document Preview
                </span>
                <span className="text-[10px] text-slate-400 truncate max-w-[150px]">
                  {selectedFile?.name || 'Uploaded File'}
                </span>
              </div>

              <div className="flex-1 min-h-[350px] max-h-[550px] bg-slate-100 rounded-xl flex items-center justify-center overflow-auto p-2">
                {filePreviewUrl ? (
                  <img
                    src={filePreviewUrl}
                    alt="Receipt preview"
                    className="max-w-full max-h-[500px] object-contain rounded-lg shadow-xs"
                  />
                ) : (
                  <div className="text-center p-6 text-slate-400 text-xs">
                    <FileText className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                    PDF Document Loaded. Verified with OCR text analysis.
                  </div>
                )}
              </div>
            </div>

            {/* Right: Editable Extraction Form */}
            <form onSubmit={handleConfirmAndSave} className="lg:col-span-7 p-6 bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Extracted Financial Information</h3>
                  <p className="text-xs text-slate-400">Edit any field before confirming</p>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold border border-indigo-100">
                  AI OCR Extracted
                </span>
              </div>

              {/* Top Row: Merchant, Bill Number, Date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Merchant / Store</label>
                  <input
                    type="text"
                    required
                    value={extractedData.merchant || ''}
                    onChange={(e) => setExtractedData({ ...extractedData, merchant: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Bill / Invoice #</label>
                  <input
                    type="text"
                    value={extractedData.billNumber || ''}
                    onChange={(e) => setExtractedData({ ...extractedData, billNumber: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Purchase Date</label>
                  <input
                    type="date"
                    required
                    value={extractedData.purchaseDate ? extractedData.purchaseDate.slice(0, 10) : ''}
                    onChange={(e) => setExtractedData({ ...extractedData, purchaseDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white"
                  />
                </div>
              </div>

              {/* Second Row: Category & Payment Method */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={extractedData.suggestedCategory || 'Groceries'}
                    onChange={(e) => setExtractedData({ ...extractedData, suggestedCategory: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white font-medium"
                  >
                    {PREDEFINED_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
                  <input
                    type="text"
                    value={extractedData.paymentMethod || 'UPI / GPay / PhonePe / Paytm'}
                    onChange={(e) => setExtractedData({ ...extractedData, paymentMethod: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white"
                  />
                </div>
              </div>

              {/* Itemized Line Items Table */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-800">
                    Product Line Items ({extractedData.items?.length || 0})
                  </span>
                  <button
                    type="button"
                    onClick={handleAddLineItem}
                    className="flex items-center space-x-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
                  {extractedData.items?.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">
                      No itemized products parsed. You can add items manually above.
                    </div>
                  ) : (
                    extractedData.items.map((item, idx) => (
                      <div key={idx} className="p-2 flex items-center space-x-2 text-xs bg-white">
                        <input
                          type="text"
                          placeholder="Product description"
                          value={item.productName}
                          onChange={(e) => handleUpdateLineItem(idx, 'productName', e.target.value)}
                          className="flex-1 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none"
                        />
                        <input
                          type="number"
                          min="1"
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={(e) => handleUpdateLineItem(idx, 'quantity', e.target.value)}
                          className="w-14 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-center outline-none"
                        />
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Price"
                          value={item.unitPrice}
                          onChange={(e) => handleUpdateLineItem(idx, 'unitPrice', e.target.value)}
                          className="w-20 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-right outline-none font-semibold"
                        />
                        <button
                          type="button"
                          onClick={() => handleDeleteLineItem(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Total & Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-slate-500 font-semibold">Total Amount (₹):</span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={extractedData.totalAmount ?? ''}
                    onChange={(e) => setExtractedData({ ...extractedData, totalAmount: e.target.value })}
                    className="w-32 px-3 py-1.5 text-base font-extrabold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white text-right"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleDiscardActiveReceipt}
                    disabled={isDeleting}
                    className="flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200/90 rounded-xl transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isDeleting ? 'Deleting...' : 'Delete'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setExtractedData(null);
                      setSelectedFile(null);
                      setFilePreviewUrl(null);
                    }}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isConfirming || confirmSuccess}
                    className="flex items-center space-x-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-100 transition-all cursor-pointer"
                  >
                    {isConfirming ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Confirm & Save Transaction</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Previously Uploaded Receipts History */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 mb-0.5">Receipt History</h2>
            <p className="text-xs text-slate-400">All uploaded invoices and confirmed OCR documents</p>
          </div>
          {receiptsList.length > 0 && (
            <button
              onClick={() => setShowClearAllModal(true)}
              className="flex items-center space-x-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-xl border border-rose-200 transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear History</span>
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          {loadingList ? (
            <div className="p-6 text-center text-xs text-slate-400">Loading receipts...</div>
          ) : receiptsList.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">No receipts uploaded yet.</div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-400 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 pl-4 pr-3 font-semibold">Store / File</th>
                  <th className="py-3 pr-3 font-semibold">Category</th>
                  <th className="py-3 pr-3 font-semibold">Date</th>
                  <th className="py-3 pr-3 font-semibold">Items</th>
                  <th className="py-3 pr-3 font-semibold">Status</th>
                  <th className="py-3 pr-4 font-semibold text-right">Amount</th>
                  <th className="py-3 pr-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {receiptsList.map((r) => (
                  <tr key={r._id} className="hover:bg-slate-50/60">
                    <td className="py-3 pl-4 pr-3">
                      <p className="font-semibold text-slate-900">{r.merchant || 'Store'}</p>
                      <p className="text-[11px] text-slate-400 truncate max-w-xs">{r.originalName}</p>
                    </td>
                    <td className="py-3 pr-3">
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-100 text-slate-700">
                        {r.suggestedCategory || 'Groceries'}
                      </span>
                    </td>
                    <td className="py-3 pr-3 text-slate-500">
                      {new Date(r.purchaseDate || r.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 pr-3 text-slate-500">{r.lineItemCount || 0} items</td>
                    <td className="py-3 pr-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          r.status === 'confirmed'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {r.status === 'confirmed' ? 'Verified' : 'Pending'}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-right font-bold text-sm text-slate-900">
                      {formatCurrency(r.totalAmount)}
                    </td>
                    <td className="py-3 pr-4 text-right">
                      <button
                        onClick={() => setDeleteConfirmId(r._id)}
                        title="Delete receipt"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Delete Single Receipt Confirmation Dialog */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-100">
          <div className="w-full max-w-sm p-6 bg-white rounded-2xl shadow-xl border border-slate-100">
            <div className="flex items-center space-x-3 text-rose-600 mb-3">
              <div className="p-2 rounded-xl bg-rose-50">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Delete Receipt?</h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              This will permanently delete this receipt document, its itemized records, and any linked transaction. This action cannot be undone.
            </p>
            <div className="flex items-center justify-end space-x-2 mt-5">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteReceipt(deleteConfirmId)}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Delete Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Receipts Confirmation Dialog */}
      {showClearAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-100">
          <div className="w-full max-w-sm p-6 bg-white rounded-2xl shadow-xl border border-slate-100">
            <div className="flex items-center space-x-3 text-rose-600 mb-3">
              <div className="p-2 rounded-xl bg-rose-50">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Clear All Receipts?</h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              This will permanently delete all uploaded receipt files, parsed line items, and linked transaction records. This action cannot be undone.
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
                onClick={handleClearAllReceipts}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                {isClearingAll ? 'Clearing...' : 'Yes, Clear All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
