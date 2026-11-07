import mongoose from 'mongoose';
import Transaction from '../models/Transaction.js';
import Budget from '../models/Budget.js';
import User from '../models/User.js';
import { getBudgetOverview } from './budgetService.js';
import { getGroqClient, DEFAULT_GROQ_MODEL } from '../config/groq.js';

/**
 * Fetch authenticated user's actual MongoDB financial context
 */
export const fetchUserFinancialContext = async (userId, targetMonth) => {
  const now = new Date();
  const month = targetMonth || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [yearStr, monthStr] = month.split('-');
  const year = parseInt(yearStr, 10);
  const monthNum = parseInt(monthStr, 10);

  const startOfMonth = new Date(year, monthNum - 1, 1);
  const endOfMonth = new Date(year, monthNum, 0, 23, 59, 59, 999);

  // 1. Current Month Income & Expenses
  const currentMonthData = await Transaction.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        date: { $gte: startOfMonth, $lte: endOfMonth },
      },
    },
    {
      $group: {
        _id: '$type',
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
  ]);

  let currentMonthlyIncome = 0;
  let currentMonthlyExpenses = 0;
  for (const item of currentMonthData) {
    if (item._id === 'income') currentMonthlyIncome = item.total;
    if (item._id === 'expense') currentMonthlyExpenses = item.total;
  }

  // 2. Lifetime Balance (Total earned minus total spent)
  const lifetimeData = await Transaction.aggregate([
    {
      $match: { userId: new mongoose.Types.ObjectId(userId) },
    },
    {
      $group: {
        _id: '$type',
        total: { $sum: '$amount' },
      },
    },
  ]);

  let lifetimeIncome = 0;
  let lifetimeExpenses = 0;
  for (const item of lifetimeData) {
    if (item._id === 'income') lifetimeIncome = item.total;
    if (item._id === 'expense') lifetimeExpenses = item.total;
  }
  const lifetimeBalance = Math.max(0, lifetimeIncome - lifetimeExpenses);

  // 3. User Budget Performance
  const budgetOverview = await getBudgetOverview(userId, month);
  const totalMonthlyBudget = budgetOverview?.totalBudget || 50000;
  const currentRemainingBudget = budgetOverview?.remainingBudget ?? Math.max(0, totalMonthlyBudget - currentMonthlyExpenses);
  const currentBudgetUtilizationPct = totalMonthlyBudget > 0
    ? Number(((currentMonthlyExpenses / totalMonthlyBudget) * 100).toFixed(1))
    : 0;

  // 4. Category-specific Budget
  const categoryBudgets = budgetOverview?.categoryBudgets || [];

  // 5. Upcoming recurring / subscription payments estimate
  const recurringAggregation = await Transaction.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        category: { $in: ['Subscriptions', 'Utilities', 'Rent'] },
        type: 'expense',
      },
    },
    {
      $group: {
        _id: '$category',
        total: { $sum: '$amount' },
        avgPerTx: { $avg: '$amount' },
      },
    },
  ]);

  const upcomingRecurringExpenses = recurringAggregation.reduce((acc, curr) => acc + (curr.total || 0), 0);

  // 6. Net current month savings
  const currentNetSavings = currentMonthlyIncome - currentMonthlyExpenses;

  return {
    month,
    currentMonthlyIncome,
    currentMonthlyExpenses,
    lifetimeBalance,
    totalMonthlyBudget,
    currentRemainingBudget,
    currentBudgetUtilizationPct,
    currentNetSavings,
    categoryBudgets,
    upcomingRecurringExpenses,
  };
};

/**
 * Deterministic Financial Affordability Calculations (strictly executed on backend)
 */
export const calculateAffordability = ({
  price,
  category,
  purchasePriority = 'Important',
  paymentMethod = 'UPI',
  emiDetails = {},
  financialContext,
}) => {
  const numPrice = Number(price) || 0;
  const isEmi = paymentMethod === 'EMI';
  const downPayment = isEmi ? Number(emiDetails.downPayment || 0) : 0;
  const monthlyInstallment = isEmi
    ? Number(emiDetails.monthlyInstallment || Math.round((numPrice - downPayment) / Math.max(1, emiDetails.tenureMonths || 6)))
    : numPrice;

  // Immediate cash impact for this month
  const immediateImpact = isEmi ? downPayment + monthlyInstallment : numPrice;

  const {
    currentMonthlyIncome,
    currentMonthlyExpenses,
    totalMonthlyBudget,
    currentRemainingBudget,
    currentBudgetUtilizationPct,
    currentNetSavings,
    lifetimeBalance,
    categoryBudgets,
    upcomingRecurringExpenses,
  } = financialContext;

  // Find category budget if configured
  const matchedCategoryBudget = categoryBudgets.find(
    (b) => b.category.toLowerCase() === (category || '').toLowerCase()
  );
  const categoryBudgetRemaining = matchedCategoryBudget ? matchedCategoryBudget.remaining : currentRemainingBudget;

  // Projected metrics after purchase
  const projectedMonthlyExpenses = currentMonthlyExpenses + immediateImpact;
  const projectedRemainingBudget = totalMonthlyBudget - projectedMonthlyExpenses;
  const projectedBudgetUtilizationPct = totalMonthlyBudget > 0
    ? Number(((projectedMonthlyExpenses / totalMonthlyBudget) * 100).toFixed(1))
    : 0;
  const projectedNetSavings = currentMonthlyIncome - projectedMonthlyExpenses;
  const budgetImpactDifference = immediateImpact;

  // Deterministic Scoring & Decision Algorithm
  let decision = 'AFFORDABLE';
  let affordabilityScore = 85;

  const budgetDeficit = projectedRemainingBudget < 0;
  const incomeDeficit = projectedNetSavings < 0;
  const priceToBudgetRatio = totalMonthlyBudget > 0 ? immediateImpact / totalMonthlyBudget : 1;
  const priceToRemainingRatio = currentRemainingBudget > 0 ? immediateImpact / currentRemainingBudget : 999;

  if (budgetDeficit || incomeDeficit) {
    // Over budget or negative monthly cash flow
    const deficitAmount = Math.abs(projectedRemainingBudget);
    if (
      purchasePriority === 'Luxury' ||
      deficitAmount > totalMonthlyBudget * 0.4 ||
      immediateImpact > (currentMonthlyIncome || totalMonthlyBudget) * 0.8
    ) {
      decision = 'NOT RECOMMENDED RIGHT NOW';
      affordabilityScore = Math.max(12, Math.min(35, Math.round(35 - (deficitAmount / totalMonthlyBudget) * 20)));
    } else {
      decision = 'WAIT AND SAVE';
      affordabilityScore = Math.max(36, Math.min(58, Math.round(58 - (deficitAmount / totalMonthlyBudget) * 15)));
    }
  } else if (projectedBudgetUtilizationPct >= 85 || priceToRemainingRatio > 0.65) {
    decision = 'AFFORDABLE WITH CAUTION';
    affordabilityScore = Math.max(60, Math.min(78, Math.round(80 - (projectedBudgetUtilizationPct - 70))));
  } else {
    decision = 'AFFORDABLE';
    affordabilityScore = Math.max(80, Math.min(96, Math.round(96 - projectedBudgetUtilizationPct * 0.15)));
  }

  // Priority and Payment Method Adjustments
  if (purchasePriority === 'Luxury' && affordabilityScore > 65) {
    affordabilityScore -= 8;
    if (decision === 'AFFORDABLE' && projectedBudgetUtilizationPct > 70) {
      decision = 'AFFORDABLE WITH CAUTION';
    }
  }

  if (paymentMethod === 'Credit Card' && projectedRemainingBudget < totalMonthlyBudget * 0.15) {
    affordabilityScore = Math.max(15, affordabilityScore - 5);
  }

  return {
    decision,
    affordabilityScore: Math.round(affordabilityScore),
    financialSnapshot: {
      currentMonthlyIncome,
      currentMonthlyExpenses,
      currentRemainingBudget,
      currentNetSavings,
      currentBudgetUtilizationPct,
      totalMonthlyBudget,
      lifetimeBalance,
      categoryBudgetRemaining,
      upcomingRecurringExpenses,
      projectedMonthlyExpenses,
      projectedRemainingBudget,
      projectedBudgetUtilizationPct,
      projectedNetSavings,
      budgetImpactDifference,
    },
    upfrontImpact: immediateImpact,
    monthlyInstallment,
  };
};

/**
 * Generate AI explanation using Groq API based strictly on verified calculations
 */
export const generateAIExplanation = async ({
  productName,
  price,
  category,
  purchasePriority,
  paymentMethod,
  decision,
  affordabilityScore,
  financialSnapshot,
}) => {
  const client = getGroqClient();

  const fallback = generateFallbackExplanation({
    productName,
    price,
    decision,
    affordabilityScore,
    financialSnapshot,
  });

  if (!client) {
    return fallback;
  }

  const prompt = `You are FinWise AI's "Before You Buy" financial advisor.
Given verified financial calculations from the user's live database, produce a concise, professional, encouraging evaluation.

VERIFIED FINANCIAL FACTS:
- Proposed Product: "${productName}" (Price: ₹${price.toLocaleString('en-IN')})
- Priority: ${purchasePriority} | Payment Method: ${paymentMethod} | Category: ${category}
- Evaluated Decision: ${decision}
- Affordability Score: ${affordabilityScore} / 100
- Total Monthly Budget: ₹${financialSnapshot.totalMonthlyBudget.toLocaleString('en-IN')}
- Current Monthly Expenses: ₹${financialSnapshot.currentMonthlyExpenses.toLocaleString('en-IN')}
- Remaining Monthly Budget Before: ₹${financialSnapshot.currentRemainingBudget.toLocaleString('en-IN')}
- Projected Monthly Expenses After: ₹${financialSnapshot.projectedMonthlyExpenses.toLocaleString('en-IN')}
- Projected Remaining Budget After: ₹${financialSnapshot.projectedRemainingBudget.toLocaleString('en-IN')}
- Current Monthly Income: ₹${financialSnapshot.currentMonthlyIncome.toLocaleString('en-IN')}
- Current Net Savings: ₹${financialSnapshot.currentNetSavings.toLocaleString('en-IN')}
- Projected Net Savings: ₹${financialSnapshot.projectedNetSavings.toLocaleString('en-IN')}

RULES:
1. Reference exact numbers provided above. Never invent different rupee amounts.
2. If decision is "WAIT AND SAVE" or "NOT RECOMMENDED RIGHT NOW", clearly explain how much the purchase exceeds the remaining budget and recommend an exact savings strategy.
3. If decision is "AFFORDABLE", validate that it safely fits within their budget.
4. Output STRICTLY a JSON object with this structure:
{
  "summary": "Clear 2-3 sentence financial verdict quoting the exact remaining budget and price.",
  "reasons": [
    "Fact 1 explaining decision",
    "Fact 2 explaining budget impact",
    "Fact 3 explaining cashflow impact"
  ],
  "risks": [
    "Specific risk 1",
    "Specific risk 2"
  ],
  "recommendations": [
    "Actionable financial advice 1",
    "Actionable financial advice 2",
    "Actionable financial advice 3"
  ],
  "suggestedDate": "e.g. Immediately or 1st of next month or After saving for 3 months"
}
Return ONLY valid JSON.`;

  try {
    const response = await client.chat.completions.create({
      model: DEFAULT_GROQ_MODEL,
      messages: [
        { role: 'system', content: 'You are an expert fintech AI advisor. Return strictly valid JSON.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);

    return {
      summary: parsed.summary || fallback.summary,
      reasons: Array.isArray(parsed.reasons) && parsed.reasons.length > 0 ? parsed.reasons : fallback.reasons,
      risks: Array.isArray(parsed.risks) && parsed.risks.length > 0 ? parsed.risks : fallback.risks,
      recommendations: Array.isArray(parsed.recommendations) && parsed.recommendations.length > 0 ? parsed.recommendations : fallback.recommendations,
      suggestedDate: parsed.suggestedDate || fallback.suggestedDate,
    };
  } catch (err) {
    console.warn('Groq AI explanation fallback used:', err.message);
    return fallback;
  }
};

/**
 * High-quality deterministic fallback explanation matching verified math
 */
export const generateFallbackExplanation = ({
  productName,
  price,
  decision,
  affordabilityScore,
  financialSnapshot,
}) => {
  const { currentRemainingBudget, projectedRemainingBudget, totalMonthlyBudget, currentMonthlyIncome } = financialSnapshot;
  const formattedPrice = `₹${price.toLocaleString('en-IN')}`;
  const formattedRemaining = `₹${Math.max(0, currentRemainingBudget).toLocaleString('en-IN')}`;

  if (decision === 'AFFORDABLE') {
    return {
      summary: `You can comfortably afford ${productName} (${formattedPrice}). Your remaining monthly budget is ${formattedRemaining}, and your projected budget remaining will stay healthy at ₹${projectedRemainingBudget.toLocaleString('en-IN')}.`,
      reasons: [
        `Purchase fits well within your remaining monthly budget of ${formattedRemaining}.`,
        `Projected budget consumption remains safe at ${financialSnapshot.projectedBudgetUtilizationPct}%.`,
        `Net savings for the month remain positive at ₹${financialSnapshot.projectedNetSavings.toLocaleString('en-IN')}.`,
      ],
      risks: [
        'Discretionary buffer reduces slightly for any unforeseen emergencies this month.',
      ],
      recommendations: [
        'Use UPI or Debit to avoid credit interest fees.',
        'Log the expense immediately after purchase to maintain accurate ledger balance.',
      ],
      suggestedDate: 'Ready to purchase now',
    };
  }

  if (decision === 'AFFORDABLE WITH CAUTION') {
    return {
      summary: `${productName} (${formattedPrice}) is technically affordable, but it consumes a substantial portion of your remaining budget (${formattedRemaining}), leaving only ₹${projectedRemainingBudget.toLocaleString('en-IN')}.`,
      reasons: [
        `Projected budget utilization will reach ${financialSnapshot.projectedBudgetUtilizationPct}%.`,
        `Consumes ${( (price / Math.max(1, currentRemainingBudget)) * 100 ).toFixed(0)}% of your remaining monthly allowance.`,
      ],
      risks: [
        'Higher vulnerability if an unexpected medical or utility expense arises before month-end.',
        'Leaves limited room for discretionary spending in other categories.',
      ],
      recommendations: [
        'Consider waiting until the last week of the month to confirm no other essential expenses occur.',
        'Review discretionary categories (Dining/Entertainment) to free up additional buffer.',
      ],
      suggestedDate: 'Wait 7–10 days before finalizing',
    };
  }

  if (decision === 'WAIT AND SAVE') {
    const deficit = Math.abs(projectedRemainingBudget);
    const suggestedMonthly = Math.max(1000, Math.round(price / 3 / 500) * 500);
    return {
      summary: `Your remaining monthly budget is ${formattedRemaining}, but ${productName} costs ${formattedPrice}. Purchasing now would exceed your budget by ₹${deficit.toLocaleString('en-IN')}. Consider saving ₹${suggestedMonthly.toLocaleString('en-IN')} per month before making this purchase.`,
      reasons: [
        `Purchase exceeds your current remaining monthly budget by ₹${deficit.toLocaleString('en-IN')}.`,
        `Projected expenses of ₹${financialSnapshot.projectedMonthlyExpenses.toLocaleString('en-IN')} exceed total monthly limit of ₹${totalMonthlyBudget.toLocaleString('en-IN')}.`,
      ],
      risks: [
        'Exceeding budget can cause cash flow strain or force high-interest debt.',
        'Depletes essential savings cushion.',
      ],
      recommendations: [
        `Set aside ₹${suggestedMonthly.toLocaleString('en-IN')} per month for ${Math.ceil(price / suggestedMonthly)} months.`,
        'Check for seasonal sales, discounts, or exchange offers while building your savings.',
      ],
      suggestedDate: `Plan purchase in ${Math.ceil(price / suggestedMonthly)} months`,
    };
  }

  // NOT RECOMMENDED RIGHT NOW
  const deficit = Math.abs(projectedRemainingBudget);
  return {
    summary: `${productName} (${formattedPrice}) is not recommended right now. It severely exceeds your monthly capacity by ₹${deficit.toLocaleString('en-IN')} and creates high financial risk.`,
    reasons: [
      `Significantly exceeds total monthly budget of ₹${totalMonthlyBudget.toLocaleString('en-IN')}.`,
      `Would result in a monthly deficit of ₹${deficit.toLocaleString('en-IN')}.`,
    ],
    risks: [
      'High risk of debt accumulation, overdraft fees, or missed payments.',
      'Significant negative impact on long-term financial security.',
    ],
    recommendations: [
      'Postpone this luxury or non-essential purchase.',
      'Build an emergency fund of at least 3 months expenses before reconsidering.',
      'Establish a dedicated sinking fund with manageable small monthly contributions.',
    ],
    suggestedDate: 'Re-evaluate in 3–6 months after building savings buffer',
  };
};

/**
 * Generate a personalized savings plan
 */
export const buildSavingsPlan = ({
  price,
  currentSavings = 0,
  monthlyIncome = 0,
  monthlyExpenses = 0,
  customMonthlySavings = null,
}) => {
  const targetAmount = Number(price) || 0;
  // Estimated amount already available or saved towards goal
  const amountSaved = Math.max(0, currentSavings > 0 ? Math.min(targetAmount * 0.25, Math.floor(currentSavings * 0.3)) : 0);
  const remainingAmount = Math.max(0, targetAmount - amountSaved);

  const monthlySurplus = Math.max(0, monthlyIncome - monthlyExpenses);
  
  // Calculate recommended monthly contribution
  let monthlySavingsRecommendation = customMonthlySavings
    ? Number(customMonthlySavings)
    : Math.max(1000, monthlySurplus > 0 ? Math.round((monthlySurplus * 0.35) / 500) * 500 : Math.round(targetAmount / 4 / 500) * 500);

  if (monthlySavingsRecommendation <= 0) monthlySavingsRecommendation = 1000;

  const estimatedMonths = Math.max(1, Math.ceil(remainingAmount / monthlySavingsRecommendation));

  const targetDate = new Date();
  targetDate.setMonth(targetDate.getMonth() + estimatedMonths);
  const estimatedCompletionDate = targetDate.toLocaleDateString('en-IN', {
    month: 'short',
    year: 'numeric',
  });

  return {
    targetAmount,
    amountSaved,
    remainingAmount,
    monthlySavingsRecommendation,
    estimatedMonths,
    estimatedCompletionDate,
    savingsTips: [
      `Automate a recurring transfer of ₹${monthlySavingsRecommendation.toLocaleString('en-IN')} on your salary day.`,
      `Keep this fund in a high-yield savings account or liquid mutual fund to earn interest.`,
      `Avoid financing with high-interest credit cards or personal loans.`,
    ],
  };
};
