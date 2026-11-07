/**
 * Format transactions into standard RFC-4180 CSV string
 */
export const generateTransactionsCsv = (transactions) => {
  const headers = [
    'Date',
    'Transaction Title',
    'Type',
    'Category',
    'Merchant',
    'Amount (INR)',
    'Payment Method',
    'Notes',
    'Receipt Attached'
  ];

  const rows = transactions.map(t => {
    const formattedDate = new Date(t.date).toISOString().split('T')[0];
    const receiptAttached = t.receiptId ? 'Yes' : 'No';
    const cleanNotes = (t.notes || '').replace(/"/g, '""');
    const cleanTitle = (t.title || '').replace(/"/g, '""');
    const cleanMerchant = (t.merchant || '').replace(/"/g, '""');

    return [
      `"${formattedDate}"`,
      `"${cleanTitle}"`,
      `"${t.type}"`,
      `"${t.category}"`,
      `"${cleanMerchant}"`,
      t.amount.toFixed(2),
      `"${t.paymentMethod || ''}"`,
      `"${cleanNotes}"`,
      `"${receiptAttached}"`
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
};
