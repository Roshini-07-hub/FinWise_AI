import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import { connectDB, disconnectDB } from '../config/db.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import Budget from '../models/Budget.js';
import Product from '../models/Product.js';
import ProductPurchase from '../models/ProductPurchase.js';
import AiInsight from '../models/AiInsight.js';
import { indexTransactionEmbedding, indexProductEmbedding } from '../services/vectorService.js';

export const seedSampleData = async () => {
  try {
    console.log('🌱 Seeding FinWise AI sample database records...');

    // Find or create demo user
    let user = await User.findOne({ email: 'demo@finwise.ai' });
    if (!user) {
      user = await User.create({
        name: 'Roshini K',
        email: 'demo@finwise.ai',
        password: 'Password@123',
        currency: { code: 'INR', symbol: '₹' },
        monthlyBudgetGoal: 65000,
      });
      console.log('👤 Created demo user: demo@finwise.ai / Password@123');
    }

    const userId = user._id;

    // Check if transactions already exist
    const txCount = await Transaction.countDocuments({ userId });
    if (txCount > 0) {
      console.log(`User already has ${txCount} transactions. Skipping initial seed.`);
      return user;
    }

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const year = now.getFullYear();
    const month = now.getMonth();

    // 1. Create Monthly Budgets
    await Budget.create([
      { userId, month: currentMonth, category: 'TOTAL', amount: 65000, notes: 'Overall monthly spending target' },
      { userId, month: currentMonth, category: 'Food & Dining', amount: 15000, notes: 'Dining & Food delivery limit' },
      { userId, month: currentMonth, category: 'Groceries', amount: 18000, notes: 'Supermarket and grocery essentials' },
      { userId, month: currentMonth, category: 'Shopping', amount: 12000, notes: 'Clothing & electronics' },
      { userId, month: currentMonth, category: 'Transportation', amount: 6000, notes: 'Cab and fuel' },
      { userId, month: currentMonth, category: 'Entertainment', amount: 4000, notes: 'Movies & streaming' },
      { userId, month: currentMonth, category: 'Utilities', amount: 5000, notes: 'Power, broadband, phone' },
    ]);

    // 2. Create Products for Purchase Intelligence
    const milk = await Product.create({
      userId,
      name: 'Amul Taaza Toned Milk 500ml',
      normalizedKey: 'amul taaza toned milk 500ml',
      brand: 'Amul',
      sizeOrVariant: '500ml',
      category: 'Groceries',
      subcategory: 'Dairy',
      aliases: ['Amul Taaza Milk 500ml', 'Amul toned milk', 'Amul milk pkt'],
      totalPurchasesCount: 12,
      totalQuantityPurchased: 14,
      totalAmountSpent: 392,
      averageUnitPrice: 28,
      lastUnitPrice: 28,
      lastPurchasedAt: new Date(year, month, Math.min(26, now.getDate())),
      lastMerchant: 'Blinkit',
    });

    const coffee = await Product.create({
      userId,
      name: 'Nescafe Classic Instant Coffee Jar 50g',
      normalizedKey: 'nescafe classic coffee jar 50g',
      brand: 'Nescafe',
      sizeOrVariant: '50g',
      category: 'Groceries',
      subcategory: 'Beverages',
      aliases: ['Nescafe coffee 50g', 'Nescafe classic jar'],
      totalPurchasesCount: 3,
      totalQuantityPurchased: 3,
      totalAmountSpent: 630,
      averageUnitPrice: 210,
      lastUnitPrice: 210,
      lastPurchasedAt: new Date(year, month, 12),
      lastMerchant: 'Zepto',
    });

    const oil = await Product.create({
      userId,
      name: 'Fortune Sunlite Refined Sunflower Oil 1L',
      normalizedKey: 'fortune sunlite sunflower oil 1l',
      brand: 'Fortune',
      sizeOrVariant: '1L',
      category: 'Groceries',
      subcategory: 'Cooking Essentials',
      aliases: ['Fortune Sunflower Oil 1L pouch', 'Fortune oil 1L'],
      totalPurchasesCount: 4,
      totalQuantityPurchased: 4,
      totalAmountSpent: 620,
      averageUnitPrice: 155,
      lastUnitPrice: 155,
      lastPurchasedAt: new Date(year, month, 15),
      lastMerchant: 'DMart',
    });

    // 3. Create Sample Transactions
    const sampleTransactions = [
      // Incomes
      { title: 'Monthly Salary Credit', amount: 95000, type: 'income', category: 'Salary', date: new Date(year, month, 1), paymentMethod: 'Net Banking', merchant: 'Infosys Technologies', notes: 'Monthly payroll' },
      { title: 'Freelance UI Design Contract', amount: 22000, type: 'income', category: 'Freelance Income', date: new Date(year, month, 14), paymentMethod: 'UPI / GPay / PhonePe / Paytm', merchant: 'Design Studio Client', notes: 'Mobile app design deliverables' },
      { title: 'Mutual Fund Dividend', amount: 3500, type: 'income', category: 'Investment Income', date: new Date(year, month, 18), paymentMethod: 'Net Banking', merchant: 'HDFC Mutual Fund', notes: 'Quarterly dividend' },

      // Expenses
      { title: 'Apartment Rent', amount: 24000, type: 'expense', category: 'Rent', date: new Date(year, month, 2), paymentMethod: 'Net Banking', merchant: 'Landlord', notes: '2BHK Monthly Rental' },
      { title: 'Weekly Grocery Essentials', amount: 3450, type: 'expense', category: 'Groceries', date: new Date(year, month, 3), paymentMethod: 'Credit Card', merchant: 'DMart Supermarket', notes: 'Rice, oil, pulses, spices' },
      { title: 'Swiggy Dinner Order', amount: 620, type: 'expense', category: 'Food & Dining', date: new Date(year, month, 4), paymentMethod: 'UPI / GPay / PhonePe / Paytm', merchant: 'Swiggy', notes: 'Biryani & dessert' },
      { title: 'Uber Ride to Office', amount: 340, type: 'expense', category: 'Transportation', date: new Date(year, month, 5), paymentMethod: 'UPI / GPay / PhonePe / Paytm', merchant: 'Uber India', notes: 'Morning commute' },
      { title: 'Electricity Utility Bill', amount: 1850, type: 'expense', category: 'Utilities', date: new Date(year, month, 7), paymentMethod: 'UPI / GPay / PhonePe / Paytm', merchant: 'BESCOM Electricity', notes: 'Monthly power consumption' },
      { title: 'Airtel Fiber Broadband Bill', amount: 1179, type: 'expense', category: 'Utilities', date: new Date(year, month, 8), paymentMethod: 'Credit Card', merchant: 'Airtel Broadband', notes: '300 Mbps fiber plan' },
      { title: 'Blinkit Instant Groceries', amount: 480, type: 'expense', category: 'Groceries', date: new Date(year, month, 9), paymentMethod: 'UPI / GPay / PhonePe / Paytm', merchant: 'Blinkit', notes: 'Milk, bread, eggs' },
      { title: 'Zomato Office Lunch', amount: 380, type: 'expense', category: 'Food & Dining', date: new Date(year, month, 10), paymentMethod: 'UPI / GPay / PhonePe / Paytm', merchant: 'Zomato', notes: 'Subway wrap combo' },
      { title: 'Amazon Online Shopping', amount: 2899, type: 'expense', category: 'Shopping', date: new Date(year, month, 11), paymentMethod: 'Credit Card', merchant: 'Amazon India', notes: 'Wireless mouse & headphones' },
      { title: 'Zepto Morning Supplies', amount: 310, type: 'expense', category: 'Groceries', date: new Date(year, month, 12), paymentMethod: 'UPI / GPay / PhonePe / Paytm', merchant: 'Zepto', notes: 'Coffee jar & snack' },
      { title: 'Apollo Pharmacy Medicines', amount: 840, type: 'expense', category: 'Healthcare', date: new Date(year, month, 13), paymentMethod: 'Debit Card', merchant: 'Apollo Pharmacy', notes: 'Vitamins & first-aid' },
      { title: 'Netflix & Spotify Subscriptions', amount: 768, type: 'expense', category: 'Subscriptions', date: new Date(year, month, 15), paymentMethod: 'Credit Card', merchant: 'Netflix India', notes: 'Streaming plans' },
      { title: 'BookMyShow Weekend Movie Tickets', amount: 920, type: 'expense', category: 'Entertainment', date: new Date(year, month, 16), paymentMethod: 'UPI / GPay / PhonePe / Paytm', merchant: 'BookMyShow (PVR)', notes: '2 IMAX movie tickets' },
      { title: 'Shell Petrol Station Fuel', amount: 2200, type: 'expense', category: 'Transportation', date: new Date(year, month, 17), paymentMethod: 'Credit Card', merchant: 'Shell India Fuel', notes: 'Vehicle tank top-up' },
      { title: 'Weekend Restaurant Dining', amount: 2450, type: 'expense', category: 'Food & Dining', date: new Date(year, month, 19), paymentMethod: 'Credit Card', merchant: 'The Black Pearl Restaurant', notes: 'Family dinner' },
      { title: 'Myntra Casual Apparel', amount: 3150, type: 'expense', category: 'Shopping', date: new Date(year, month, 21), paymentMethod: 'Credit Card', merchant: 'Myntra Fashion', notes: 'Cotton shirts and sneakers' },
    ];

    for (const t of sampleTransactions) {
      await Transaction.create({
        ...t,
        userId,
        categorizationMethod: 'rule',
        confidenceScore: 0.95,
      });
    }

    // 4. Create Product Purchases for repeat detection
    for (let day = 2; day <= Math.min(26, now.getDate()); day += 2) {
      await ProductPurchase.create({
        userId,
        productId: milk._id,
        rawItemDescription: 'Amul Taaza Milk 500ml',
        quantity: 1,
        unitPrice: 28,
        totalPrice: 28,
        merchant: 'Blinkit',
        date: new Date(year, month, day),
      });
    }

    // 5. Create AI Insights
    await AiInsight.create([
      {
        userId,
        month: currentMonth,
        type: 'achievement',
        title: 'Strong Savings Rate (48%)',
        message: 'Your net income exceeds total expenses by ₹42,394 this month. You are on track to save over 45% of your total earnings.',
        category: 'General',
        impactLevel: 'medium',
        savingsPotential: 0,
      },
      {
        userId,
        month: currentMonth,
        type: 'pattern',
        title: 'Daily Dairy & Grocery Frequency',
        message: 'You purchased milk 12 times this month totaling ₹392. Consider a subscription or multi-pack order to save on delivery fees.',
        category: 'Groceries',
        impactLevel: 'low',
        savingsPotential: 120,
      },
      {
        userId,
        month: currentMonth,
        type: 'warning',
        title: 'Food Delivery Spending Alert',
        message: 'You spent ₹3,450 across Swiggy and Zomato in the past 14 days. Reducing takeout orders by 25% could save approximately ₹860 monthly.',
        category: 'Food & Dining',
        impactLevel: 'high',
        savingsPotential: 860,
      },
      {
        userId,
        month: currentMonth,
        type: 'tip',
        title: 'Utilities Well Within Budget',
        message: 'Electricity and fiber broadband bills are at ₹3,029, only 60.5% of your ₹5,000 monthly utility allocation.',
        category: 'Utilities',
        impactLevel: 'low',
        savingsPotential: 0,
      },
    ]);

    console.log('✅ FinWise AI sample database seeded successfully!');
    return user;
  } catch (err) {
    console.error('Error during data seeding:', err);
  }
};

// If run directly via node
if (process.argv[1]?.endsWith('seedData.js')) {
  (async () => {
    await connectDB();
    await seedSampleData();
    await disconnectDB();
    process.exit(0);
  })();
}
