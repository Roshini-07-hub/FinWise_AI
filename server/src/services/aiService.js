import { getGroqClient, DEFAULT_GROQ_MODEL } from '../config/groq.js';
import { DETERMINISTIC_MERCHANTS, PREDEFINED_CATEGORIES } from '../config/constants.js';

/**
 * Fallback deterministic merchant and category detection
 */
export const deterministicCategorize = (title, merchant = '', notes = '') => {
  const combined = `${title} ${merchant} ${notes}`.toLowerCase();
  for (const item of DETERMINISTIC_MERCHANTS) {
    if (item.regex.test(combined)) {
      return {
        category: item.category,
        confidence: 0.88,
        merchant: merchant || item.title,
        suggestedTitle: title || item.title,
        method: 'rule',
      };
    }
  }

  return {
    category: 'Other',
    confidence: 0.5,
    merchant: merchant || '',
    suggestedTitle: title,
    method: 'rule',
  };
};

/**
 * AI-powered transaction categorization using Groq
 */
export const categorizeTransaction = async ({ title, amount, merchant, notes }) => {
  const ruleResult = deterministicCategorize(title, merchant, notes);
  const client = getGroqClient();

  if (!client) {
    return ruleResult;
  }

  const categoryNames = PREDEFINED_CATEGORIES.map(c => c.name).join(', ');

  const systemPrompt = `You are a financial intelligence categorization engine for FinWise AI.
Categorize personal financial transactions with high accuracy.
Available Categories:
${categoryNames}

Return strictly a valid JSON object with these keys:
{
  "category": "One exact category from the available list",
  "confidence": 0.0 to 1.0,
  "merchant": "Identified clean merchant or brand name",
  "suggestedTitle": "Clean professional transaction title"
}
Do NOT include markdown quotes, backticks, or any conversational text. Return ONLY pure JSON.`;

  const userPrompt = `Transaction details:
Title: "${title || ''}"
Merchant: "${merchant || ''}"
Amount: ${amount || 0}
Notes: "${notes || ''}"`;

  try {
    const response = await client.chat.completions.create({
      model: DEFAULT_GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' }
    });

    const parsed = JSON.parse(response.choices[0]?.message?.content || '{}');
    
    // Validate returned category against predefined list
    const validCategory = PREDEFINED_CATEGORIES.some(c => c.name.toLowerCase() === (parsed.category || '').toLowerCase())
      ? PREDEFINED_CATEGORIES.find(c => c.name.toLowerCase() === (parsed.category || '').toLowerCase()).name
      : ruleResult.category;

    return {
      category: validCategory,
      confidence: parsed.confidence || 0.9,
      merchant: parsed.merchant || ruleResult.merchant,
      suggestedTitle: parsed.suggestedTitle || title,
      method: 'ai',
    };
  } catch (err) {
    console.error('Groq categorization fallback to deterministic rules:', err.message);
    return ruleResult;
  }
};

/**
 * AI-powered Receipt and Bill Vision extraction using Groq Multimodal Vision
 */
export const parseReceiptImage = async (filePath, mimeType) => {
  const client = getGroqClient();
  if (!client) {
    return null;
  }

  try {
    const fs = await import('fs');
    const imageBuffer = fs.readFileSync(filePath);
    const base64Data = imageBuffer.toString('base64');
    const dataUrl = `data:${mimeType || 'image/png'};base64,${base64Data}`;

    const prompt = `You are an expert OCR receipt and invoice parser.
Analyze this invoice/receipt image and extract all details.
Return STRICTLY a JSON object with this exact structure:
{
  "merchant": "Store or merchant name",
  "billNumber": "Invoice or bill number if found, or empty string",
  "purchaseDate": "YYYY-MM-DD",
  "totalAmount": 0.00,
  "subtotal": 0.00,
  "taxAmount": 0.00,
  "discountAmount": 0.00,
  "paymentMethod": "UPI / Cash / Card / Net Banking",
  "suggestedCategory": "One of: Groceries, Food & Dining, Shopping, Healthcare, Utilities, Personal Care, Transportation, Other",
  "items": [
    {
      "productName": "Exact item name from receipt",
      "quantity": 1,
      "unitPrice": 0.00,
      "totalPrice": 0.00,
      "discount": 0.00
    }
  ]
}
Rules:
- Look carefully for "Invoice No", "Bill No", "Receipt #", "Tax Invoice #", or invoice identifiers (e.g., "001", "INV-102") and populate in "billNumber".
- For purchaseDate, convert whatever date appears on the invoice (e.g. "11 August 2023" or "19-08-2023") to standard YYYY-MM-DD format.
- Ensure totalAmount is a valid positive number representing the final total amount payable on the receipt (NOT 0). Look for "Total Amount", "Grand Total", or "Net Amount".
- Extract every single product line item in the table with its name, quantity (extract numerical quantity like 5, 10, etc.), unit price, and total price.
- Return ONLY the raw JSON object, without markdown formatting or conversational text.`;

    const response = await client.chat.completions.create({
      model: DEFAULT_GROQ_MODEL,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: dataUrl } }
          ]
        }
      ],
      temperature: 0.1,
    });

    const raw = response.choices[0]?.message?.content || '{}';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      merchant: parsed.merchant || 'Store / Merchant',
      billNumber: parsed.billNumber || '',
      purchaseDate: parsed.purchaseDate || new Date().toISOString().split('T')[0],
      totalAmount: Number(parsed.totalAmount) || 0,
      subtotal: Number(parsed.subtotal) || Number(parsed.totalAmount) || 0,
      taxAmount: Number(parsed.taxAmount) || 0,
      discountAmount: Number(parsed.discountAmount) || 0,
      paymentMethod: parsed.paymentMethod || 'UPI / GPay / PhonePe / Paytm',
      suggestedCategory: parsed.suggestedCategory || 'Groceries',
      items: Array.isArray(parsed.items) ? parsed.items.map(item => ({
        productName: String(item.productName || 'Item').trim(),
        quantity: Math.max(1, Number(item.quantity) || 1),
        unitPrice: Number(item.unitPrice) || Number(item.totalPrice) || 0,
        totalPrice: Number(item.totalPrice) || (Number(item.unitPrice) * (Number(item.quantity) || 1)) || 0,
        discount: Number(item.discount) || 0
      })) : []
    };
  } catch (err) {
    console.error('Groq Vision parser error:', err.message);
    return null;
  }
};

/**
 * AI-powered Receipt and Bill OCR structured extraction from text
 */
export const parseReceiptText = async (rawText) => {
  const client = getGroqClient();

  if (!client) {
    // Intelligent heuristic regex parser if Groq is not configured
    return fallbackParseReceiptText(rawText);
  }

  const systemPrompt = `You are an expert OCR receipt and invoice parser for personal finance.
Given the raw OCR text of a bill/receipt, extract all financial and itemized details.

Return strictly a JSON object with this exact structure:
{
  "merchant": "Store or merchant name",
  "billNumber": "Invoice or bill number if found, or empty string",
  "purchaseDate": "YYYY-MM-DD or empty string",
  "totalAmount": 0.00,
  "subtotal": 0.00,
  "taxAmount": 0.00,
  "discountAmount": 0.00,
  "paymentMethod": "UPI / Cash / Card etc., or empty string",
  "suggestedCategory": "One of: Groceries, Food & Dining, Shopping, Healthcare, Utilities, Personal Care, Transportation, Other",
  "items": [
    {
      "productName": "Exact item name from receipt",
      "quantity": 1,
      "unitPrice": 0.00,
      "totalPrice": 0.00,
      "discount": 0.00
    }
  ]
}
If quantities or unit prices cannot be parsed individually, default quantity to 1 and unitPrice to totalPrice.
Ensure all numerical values are numbers, not strings.
Output ONLY pure JSON.`;

  try {
    const response = await client.chat.completions.create({
      model: DEFAULT_GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Here is the raw OCR text:\n\n${rawText.slice(0, 4000)}` }
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' }
    });

    const parsed = JSON.parse(response.choices[0]?.message?.content || '{}');
    return {
      merchant: parsed.merchant || 'Store / Merchant',
      billNumber: parsed.billNumber || '',
      purchaseDate: parsed.purchaseDate || new Date().toISOString().split('T')[0],
      totalAmount: Number(parsed.totalAmount) || 0,
      subtotal: Number(parsed.subtotal) || Number(parsed.totalAmount) || 0,
      taxAmount: Number(parsed.taxAmount) || 0,
      discountAmount: Number(parsed.discountAmount) || 0,
      paymentMethod: parsed.paymentMethod || 'UPI / GPay / PhonePe / Paytm',
      suggestedCategory: parsed.suggestedCategory || 'Groceries',
      items: Array.isArray(parsed.items) ? parsed.items.map(item => ({
        productName: String(item.productName || 'Item').trim(),
        quantity: Math.max(1, Number(item.quantity) || 1),
        unitPrice: Number(item.unitPrice) || Number(item.totalPrice) || 0,
        totalPrice: Number(item.totalPrice) || (Number(item.unitPrice) * (Number(item.quantity) || 1)) || 0,
        discount: Number(item.discount) || 0
      })) : []
    };
  } catch (err) {
    console.error('Groq Receipt parser error, falling back:', err.message);
    return fallbackParseReceiptText(rawText);
  }
};

/**
 * Heuristic fallback parser when Groq is offline or key is missing
 */
const fallbackParseReceiptText = (rawText) => {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  let totalAmount = 0;
  let merchant = lines[0] ? lines[0].slice(0, 40) : 'Store / Merchant';
  let purchaseDate = new Date().toISOString().split('T')[0];

  // Try to find total amount with comprehensive regex
  const totalMatch =
    rawText.match(/(?:total\s*amount|grand\s*total|net\s*amount|amount\s*payable|amount\s*paid|sub\s*total|total)\s*(?:rs\.?|inr|₹|:)?\s*([0-9,]+(?:\.[0-9]{2})?)/i) ||
    rawText.match(/(?:rs\.?|inr|₹)\s*[:.-]?\s*([0-9,]+(?:\.[0-9]{2})?)/i);
  if (totalMatch && totalMatch[1]) {
    totalAmount = parseFloat(totalMatch[1].replace(/,/g, ''));
  }

  // Try date regex
  const dateMatch = rawText.match(/(\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})/);
  if (dateMatch && dateMatch[1]) {
    purchaseDate = dateMatch[1];
  }

  const items = [];
  // Extract potential items with price at end of line
  for (const line of lines.slice(1, 15)) {
    const itemMatch = line.match(/^([a-zA-Z0-9\s.,&'-]{3,35})\s+([0-9]+(?:\.[0-9]{2})?)$/);
    if (itemMatch) {
      const price = parseFloat(itemMatch[2]);
      if (price > 0 && price < (totalAmount || 100000)) {
        items.push({
          productName: itemMatch[1].trim(),
          quantity: 1,
          unitPrice: price,
          totalPrice: price,
          discount: 0
        });
      }
    }
  }

  return {
    merchant,
    billNumber: '',
    purchaseDate,
    totalAmount: totalAmount || (items.reduce((s, i) => s + i.totalPrice, 0) || 0),
    subtotal: totalAmount || 0,
    taxAmount: 0,
    discountAmount: 0,
    paymentMethod: 'UPI / GPay / PhonePe / Paytm',
    suggestedCategory: 'Groceries',
    items
  };
};

/**
 * Smart product name normalization and metadata extraction
 */
export const normalizeProduct = async (rawProductName) => {
  const client = getGroqClient();

  if (!client) {
    const cleaned = rawProductName.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    return {
      name: rawProductName,
      normalizedKey: cleaned,
      brand: '',
      sizeOrVariant: '',
      category: 'Groceries',
      subcategory: 'General'
    };
  }

  const systemPrompt = `You are a product catalog normalization AI for retail and grocery intelligence.
Analyze the raw receipt product description.
Rules:
- Preserve brand, size, and variant (e.g. "Amul Toned Milk 500ml" vs "Amul Full Cream 1L" are separate variants!).
- Create a normalizedKey: a simplified lowercased standard key without noise (e.g. "amul toned milk 500ml").
- Identify brand, sizeOrVariant, category, subcategory.

Return strictly a JSON object:
{
  "canonicalName": "Clean Title Cased Product Name (e.g., Amul Taaza Toned Milk 500ml)",
  "normalizedKey": "standardized key preserving variant e.g. amul toned milk 500ml",
  "brand": "Brand name e.g. Amul",
  "sizeOrVariant": "500ml, 1kg, 200g, etc. or empty",
  "category": "Groceries, Food & Dining, Personal Care, Healthcare, Shopping, or Other",
  "subcategory": "Dairy, Bakery, Snacks, Beverages, Produce, Toiletries, etc."
}`;

  try {
    const response = await client.chat.completions.create({
      model: DEFAULT_GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Product description: "${rawProductName}"` }
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' }
    });

    const parsed = JSON.parse(response.choices[0]?.message?.content || '{}');
    return {
      name: parsed.canonicalName || rawProductName,
      normalizedKey: (parsed.normalizedKey || rawProductName).toLowerCase().trim(),
      brand: parsed.brand || '',
      sizeOrVariant: parsed.sizeOrVariant || '',
      category: parsed.category || 'Groceries',
      subcategory: parsed.subcategory || 'General'
    };
  } catch (err) {
    console.error('Groq product normalization fallback:', err.message);
    const cleaned = rawProductName.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    return {
      name: rawProductName,
      normalizedKey: cleaned,
      brand: '',
      sizeOrVariant: '',
      category: 'Groceries',
      subcategory: 'General'
    };
  }
};

/**
 * AI Financial Insights generation
 */
export const generateFinancialInsights = async ({
  month,
  totalIncome,
  totalExpense,
  netSavings,
  budget,
  categorySpending,
  frequentProducts,
  previousMonthComparison
}) => {
  const client = getGroqClient();

  if (!client) {
    // Return high quality computed rule-based insights
    return generateFallbackInsights({
      month,
      totalIncome,
      totalExpense,
      netSavings,
      budget,
      categorySpending,
      frequentProducts,
      previousMonthComparison
    });
  }

  const systemPrompt = `You are FinWise AI's Senior Financial Analyst.
Analyze the user's verified financial facts for ${month}.
RULES:
1. NEVER INVENT financial figures or facts. Base everything directly on the supplied numbers.
2. Provide 3 to 5 actionable, distinct financial insights.
3. Categorize each insight as: 'warning', 'tip', 'pattern', 'savings', or 'achievement'.
4. Mention specific categories, spending trends, and realistic savings opportunities.

Return strictly a JSON object:
{
  "insights": [
    {
      "type": "warning | tip | pattern | savings | achievement",
      "title": "Clear concise insight headline",
      "message": "Detailed 2-3 sentence personalized analysis with exact numbers.",
      "category": "Category name or General",
      "impactLevel": "high | medium | low",
      "savingsPotential": 0.00
    }
  ]
}`;

  const userPrompt = `Verified user financial data:
- Month: ${month}
- Total Income: ₹${totalIncome.toFixed(2)}
- Total Expenses: ₹${totalExpense.toFixed(2)}
- Net Savings: ₹${netSavings.toFixed(2)}
- Monthly Budget: ₹${budget.amount ? budget.amount.toFixed(2) : 'Not Set'}
- Budget Consumed: ${budget.percentageUsed ? budget.percentageUsed.toFixed(1) + '%' : 'N/A'}
- Category Breakdown: ${JSON.stringify(categorySpending)}
- Previous Month Comparison: ${JSON.stringify(previousMonthComparison)}
- Top Frequently Purchased Products: ${JSON.stringify(frequentProducts.slice(0, 5))}`;

  try {
    const response = await client.chat.completions.create({
      model: DEFAULT_GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });

    const parsed = JSON.parse(response.choices[0]?.message?.content || '{}');
    if (Array.isArray(parsed.insights) && parsed.insights.length > 0) {
      return parsed.insights;
    }
    return generateFallbackInsights({ month, totalIncome, totalExpense, netSavings, budget, categorySpending, frequentProducts, previousMonthComparison });
  } catch (err) {
    console.error('Groq insights generation fallback:', err.message);
    return generateFallbackInsights({ month, totalIncome, totalExpense, netSavings, budget, categorySpending, frequentProducts, previousMonthComparison });
  }
};

/**
 * Fallback analytical insights engine based on exact calculations
 */
const generateFallbackInsights = ({
  month,
  totalIncome,
  totalExpense,
  netSavings,
  budget,
  categorySpending,
  frequentProducts,
  previousMonthComparison
}) => {
  const insights = [];

  // 1. Budget consumption check
  if (budget.amount > 0) {
    const pct = (totalExpense / budget.amount) * 100;
    if (pct >= 100) {
      insights.push({
        type: 'warning',
        title: 'Monthly Budget Exceeded',
        message: `You have spent ₹${totalExpense.toLocaleString('en-IN')}, exceeding your ₹${budget.amount.toLocaleString('en-IN')} budget by ${(pct - 100).toFixed(1)}%. Consider trimming non-essential expenses for the remainder of ${month}.`,
        category: 'General',
        impactLevel: 'high',
        savingsPotential: totalExpense - budget.amount
      });
    } else if (pct >= 85) {
      insights.push({
        type: 'warning',
        title: 'Budget Alert (High Consumption)',
        message: `You have utilized ${pct.toFixed(1)}% of your monthly budget. Remaining budget is ₹${(budget.amount - totalExpense).toLocaleString('en-IN')}.`,
        category: 'General',
        impactLevel: 'medium',
        savingsPotential: (budget.amount - totalExpense) * 0.2
      });
    } else {
      insights.push({
        type: 'achievement',
        title: 'Spending Within Budget Target',
        message: `Great job! You have only spent ${pct.toFixed(1)}% of your ₹${budget.amount.toLocaleString('en-IN')} budget with ₹${(budget.amount - totalExpense).toLocaleString('en-IN')} remaining.`,
        category: 'General',
        impactLevel: 'low',
        savingsPotential: 0
      });
    }
  }

  // 2. Highest spending category
  if (categorySpending && categorySpending.length > 0) {
    const topCat = categorySpending[0];
    const catPct = totalExpense > 0 ? ((topCat.total / totalExpense) * 100).toFixed(1) : 0;
    insights.push({
      type: 'pattern',
      title: `Highest Spending: ${topCat.category}`,
      message: `${topCat.category} accounts for ₹${topCat.total.toLocaleString('en-IN')} (${catPct}% of your total expenses) across ${topCat.count} transactions.`,
      category: topCat.category,
      impactLevel: 'medium',
      savingsPotential: topCat.total * 0.15
    });
  }

  // 3. Frequent product pattern
  if (frequentProducts && frequentProducts.length > 0) {
    const topProd = frequentProducts[0];
    insights.push({
      type: 'tip',
      title: `Frequent Purchase: ${topProd.name}`,
      message: `You purchased ${topProd.name} ${topProd.totalPurchasesCount} times this period, spending ₹${topProd.totalAmountSpent.toLocaleString('en-IN')} at an average of ₹${topProd.averageUnitPrice.toFixed(1)}/unit.`,
      category: topProd.category || 'Groceries',
      impactLevel: 'low',
      savingsPotential: topProd.totalAmountSpent * 0.1
    });
  }

  // 4. Savings rate
  if (totalIncome > 0) {
    const savingsRate = ((netSavings / totalIncome) * 100).toFixed(1);
    insights.push({
      type: netSavings >= 0 ? 'achievement' : 'warning',
      title: netSavings >= 0 ? `Savings Rate: ${savingsRate}%` : 'Negative Net Cash Flow',
      message: netSavings >= 0 
        ? `You saved ₹${netSavings.toLocaleString('en-IN')} out of ₹${totalIncome.toLocaleString('en-IN')} earned this month, maintaining a healthy ${savingsRate}% savings rate.`
        : `Your expenses exceed your income by ₹${Math.abs(netSavings).toLocaleString('en-IN')} this month. Review recurring subscriptions and online deliveries.`,
      category: 'General',
      impactLevel: netSavings < 0 ? 'high' : 'medium',
      savingsPotential: netSavings < 0 ? Math.abs(netSavings) : 0
    });
  }

  return insights;
};

/**
 * AI Financial Assistant natural language conversational explanation
 */
export const answerFinancialQuery = async ({
  question,
  financialSummary,
  chatHistory = []
}) => {
  const client = getGroqClient();

  if (!client) {
    return `Based on your database records for this period:
- Total Income: ₹${financialSummary.totalIncome.toLocaleString('en-IN')}
- Total Expenses: ₹${financialSummary.totalExpenses.toLocaleString('en-IN')}
- Net Balance: ₹${financialSummary.netBalance.toLocaleString('en-IN')}
- Top Category: ${financialSummary.topCategory || 'N/A'} (₹${(financialSummary.topCategoryAmount || 0).toLocaleString('en-IN')})
- Remaining Budget: ₹${(financialSummary.remainingBudget || 0).toLocaleString('en-IN')}

(Note: Connect your GROQ_API_KEY in server/.env for personalized conversational answers and deep query interpretation).`;
  }

  const systemPrompt = `You are FinWise AI, an intelligent, friendly, and precise personal financial assistant.
You answer user financial inquiries using ONLY verified facts calculated directly by our backend system.

CRITICAL INSTRUCTIONS:
1. NEVER invent, hallucinate, or estimate numbers. Always quote the provided financial totals accurately in Indian Rupees (₹).
2. Answer the user's specific question directly in a concise, structured, and helpful tone.
3. If they ask about saving money, provide realistic fintech tips based on their actual numbers.
4. Keep answers readable with markdown bullet points where appropriate.`;

  const contextData = `
User Financial Summary from Database:
- Current Month: ${financialSummary.month}
- Total Income: ₹${financialSummary.totalIncome.toFixed(2)}
- Total Expenses: ₹${financialSummary.totalExpenses.toFixed(2)}
- Net Balance / Savings: ₹${financialSummary.netBalance.toFixed(2)}
- Monthly Budget: ₹${financialSummary.monthlyBudget.toFixed(2)}
- Remaining Budget: ₹${financialSummary.remainingBudget.toFixed(2)}
- Budget Consumed: ${financialSummary.budgetUsedPercentage.toFixed(1)}%
- Top Spending Categories: ${JSON.stringify(financialSummary.categoryBreakdown || [])}
- Top Merchants: ${JSON.stringify(financialSummary.topMerchants || [])}
- Top Products: ${JSON.stringify(financialSummary.topProducts || [])}
- Recent Query Specific Matches: ${JSON.stringify(financialSummary.queryMatches || [])}
`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'system', content: `Current Database Calculations:\n${contextData}` }
  ];

  // Append recent context messages
  for (const msg of chatHistory.slice(-4)) {
    messages.push({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content
    });
  }

  messages.push({ role: 'user', content: question });

  try {
    const response = await client.chat.completions.create({
      model: DEFAULT_GROQ_MODEL,
      messages,
      temperature: 0.2,
      max_tokens: 600,
    });

    return response.choices[0]?.message?.content || 'I could not generate an answer at this time.';
  } catch (err) {
    console.error('Groq Chat Assistant error:', err.message);
    return `Here is your current financial summary from the database:
- Total Income: ₹${financialSummary.totalIncome.toLocaleString('en-IN')}
- Total Expenses: ₹${financialSummary.totalExpenses.toLocaleString('en-IN')}
- Remaining Monthly Budget: ₹${financialSummary.remainingBudget.toLocaleString('en-IN')}
- Top Spending Category: ${financialSummary.topCategory || 'N/A'}`;
  }
};
