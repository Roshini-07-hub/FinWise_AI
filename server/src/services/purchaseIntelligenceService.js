import Product from '../models/Product.js';
import ProductPurchase from '../models/ProductPurchase.js';
import Transaction from '../models/Transaction.js';
import { normalizeProduct } from './aiService.js';
import { indexProductEmbedding, findSimilarProducts } from './vectorService.js';

/**
 * Record confirmed receipt items into product intelligence
 */
export const recordReceiptProducts = async ({
  userId,
  transactionId,
  receiptId,
  merchant,
  date,
  items = []
}) => {
  const recorded = [];

  for (const item of items) {
    if (!item.productName || item.totalPrice <= 0) continue;

    // 1. Normalize product via AI
    const norm = await normalizeProduct(item.productName);

    // 2. Check for existing product for this user using normalized key
    let product = await Product.findOne({
      userId,
      normalizedKey: norm.normalizedKey,
    });

    // If not exact key match, check semantic similarity via vector store
    if (!product) {
      const similar = await findSimilarProducts({
        userId,
        queryText: norm.normalizedKey,
        limit: 1,
      });

      if (similar.length > 0 && similar[0].similarity > 0.88) {
        // High semantic similarity - verify brand and size match before merging
        const candidate = await Product.findById(similar[0].metadata.product_id);
        if (
          candidate &&
          (!norm.brand || !candidate.brand || norm.brand.toLowerCase() === candidate.brand.toLowerCase()) &&
          (!norm.sizeOrVariant || !candidate.sizeOrVariant || norm.sizeOrVariant.toLowerCase() === candidate.sizeOrVariant.toLowerCase())
        ) {
          product = candidate;
        }
      }
    }

    const qty = Math.max(1, Number(item.quantity) || 1);
    const unitPrice = Number(item.unitPrice) || (Number(item.totalPrice) / qty);
    const totalPrice = Number(item.totalPrice);

    if (product) {
      // Update existing product aggregated stats
      product.totalPurchasesCount += 1;
      product.totalQuantityPurchased += qty;
      product.totalAmountSpent += totalPrice;
      product.averageUnitPrice = product.totalAmountSpent / Math.max(1, product.totalQuantityPurchased);
      product.lastUnitPrice = unitPrice;
      product.lastPurchasedAt = date || new Date();
      product.lastMerchant = merchant || product.lastMerchant;
      
      if (!product.aliases.includes(item.productName)) {
        product.aliases.push(item.productName);
      }
      await product.save();
    } else {
      // Create new canonical product
      product = await Product.create({
        userId,
        name: norm.name || item.productName,
        normalizedKey: norm.normalizedKey,
        brand: norm.brand,
        sizeOrVariant: norm.sizeOrVariant,
        category: norm.category || item.category || 'Groceries',
        subcategory: norm.subcategory || 'General',
        aliases: [item.productName],
        totalPurchasesCount: 1,
        totalQuantityPurchased: qty,
        totalAmountSpent: totalPrice,
        averageUnitPrice: unitPrice,
        lastUnitPrice: unitPrice,
        lastPurchasedAt: date || new Date(),
        lastMerchant: merchant || '',
      });

      // Index in ChromaDB
      await indexProductEmbedding({
        userId,
        productId: product._id,
        productName: product.name,
        normalizedKey: product.normalizedKey,
        brand: product.brand,
        category: product.category,
        merchant: product.lastMerchant,
      });
    }

    // 3. Create persistent purchase audit entry
    const purchase = await ProductPurchase.create({
      userId,
      productId: product._id,
      transactionId,
      receiptId,
      rawItemDescription: item.productName,
      quantity: qty,
      unitPrice,
      totalPrice,
      merchant: merchant || '',
      date: date || new Date(),
    });

    recorded.push({ product, purchase });
  }

  return recorded;
};

/**
 * Record a single expense transaction as a product purchase
 */
export const recordTransactionProduct = async ({
  userId,
  transactionId,
  title,
  amount,
  category = 'Groceries',
  merchant = '',
  date = new Date(),
}) => {
  if (!title || Number(amount) <= 0) return null;

  const cleanTitle = title.trim();
  const normalizedKey = cleanTitle.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

  // Find existing product for this user
  let product = await Product.findOne({
    userId,
    $or: [
      { normalizedKey },
      { name: { $regex: new RegExp(`^${cleanTitle}$`, 'i') } },
      { aliases: cleanTitle }
    ]
  });

  if (!product) {
    try {
      const similar = await findSimilarProducts({
        userId,
        queryText: normalizedKey,
        limit: 1,
      });
      if (similar.length > 0 && similar[0].similarity > 0.88) {
        const candidate = await Product.findById(similar[0].metadata?.product_id);
        if (candidate) product = candidate;
      }
    } catch (e) {}
  }

  const qty = 1;
  const numAmount = Number(amount);

  if (product) {
    product.totalPurchasesCount += 1;
    product.totalQuantityPurchased += qty;
    product.totalAmountSpent += numAmount;
    product.averageUnitPrice = Number((product.totalAmountSpent / Math.max(1, product.totalQuantityPurchased)).toFixed(2));
    product.lastUnitPrice = numAmount;
    product.lastPurchasedAt = date || new Date();
    if (merchant) product.lastMerchant = merchant;
    if (!product.aliases.includes(cleanTitle)) {
      product.aliases.push(cleanTitle);
    }
    await product.save();
  } else {
    const canonicalName = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);
    product = await Product.create({
      userId,
      name: canonicalName,
      normalizedKey,
      brand: merchant || '',
      sizeOrVariant: '',
      category: category || 'Groceries',
      subcategory: category || 'General',
      aliases: [cleanTitle],
      totalPurchasesCount: 1,
      totalQuantityPurchased: 1,
      totalAmountSpent: numAmount,
      averageUnitPrice: numAmount,
      lastUnitPrice: numAmount,
      lastPurchasedAt: date || new Date(),
      lastMerchant: merchant || '',
    });

    indexProductEmbedding({
      userId,
      productId: product._id,
      productName: product.name,
      normalizedKey: product.normalizedKey,
      brand: product.brand,
      category: product.category,
      merchant: product.lastMerchant,
    }).catch(() => {});
  }

  // Create ProductPurchase audit entry
  const purchase = await ProductPurchase.create({
    userId,
    productId: product._id,
    transactionId,
    rawItemDescription: cleanTitle,
    quantity: 1,
    unitPrice: numAmount,
    totalPrice: numAmount,
    merchant: merchant || '',
    date: date || new Date(),
  });

  return { product, purchase };
};

/**
 * Synchronize any unindexed expense transactions (e.g. manual milk purchases) into products
 */
export const syncUnindexedTransactions = async (userId) => {
  try {
    const expenseTransactions = await Transaction.find({
      userId,
      type: 'expense',
      amount: { $gt: 0 },
    }).lean();

    if (!expenseTransactions.length) return;

    const existingPurchases = await ProductPurchase.find({ userId }).select('transactionId').lean();
    const existingTxIdSet = new Set(existingPurchases.map(p => String(p.transactionId)).filter(Boolean));

    const unindexed = expenseTransactions.filter(tx => !existingTxIdSet.has(String(tx._id)));

    for (const tx of unindexed) {
      await recordTransactionProduct({
        userId,
        transactionId: tx._id,
        title: tx.title,
        amount: tx.amount,
        category: tx.category,
        merchant: tx.merchant,
        date: tx.date || tx.createdAt,
      });
    }
  } catch (err) {
    console.error('Error syncing unindexed transactions to products:', err.message);
  }
};

/**
 * Get comprehensive purchase intelligence and recurring insights for a user
 */
export const getPurchaseIntelligence = async (userId, timeFilter = 'this-month') => {
  // Sync any transactions that haven't been indexed yet (e.g. manual milk transactions)
  await syncUnindexedTransactions(userId);

  // Determine date boundary
  const now = new Date();
  let startDate = new Date(now.getFullYear(), now.getMonth(), 1);

  if (timeFilter === 'last-month') {
    startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  } else if (timeFilter === 'last-3-months') {
    startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  } else if (timeFilter === 'all') {
    startDate = new Date(2000, 0, 1);
  }

  // 1. Fetch all product purchases in range
  const purchasesInRange = await ProductPurchase.find({
    userId,
    date: { $gte: startDate },
  }).populate('productId').lean();

  // 2. Aggregate purchases by product
  const categoryStats = {};
  const subcategoryStats = {};
  const productAggMap = {};

  for (const p of purchasesInRange) {
    const prod = p.productId || {};
    const cat = prod.category || 'Groceries';
    const subcat = prod.subcategory || 'General';
    const prodId = String(prod._id || p.rawItemDescription);

    categoryStats[cat] = (categoryStats[cat] || 0) + p.totalPrice;
    subcategoryStats[subcat] = (subcategoryStats[subcat] || 0) + p.totalPrice;

    if (!productAggMap[prodId]) {
      productAggMap[prodId] = {
        _id: prod._id || prodId,
        name: prod.name || p.rawItemDescription,
        brand: prod.brand || '',
        sizeOrVariant: prod.sizeOrVariant || '',
        category: cat,
        subcategory: subcat,
        aliases: prod.aliases || [p.rawItemDescription],
        totalPurchasesCount: 0,
        totalQuantityPurchased: 0,
        totalAmountSpent: 0,
        averageUnitPrice: 0,
        lastUnitPrice: p.unitPrice,
        lastPurchasedAt: p.date,
        lastMerchant: p.merchant || prod.lastMerchant || '',
      };
    }

    productAggMap[prodId].totalPurchasesCount += 1;
    productAggMap[prodId].totalQuantityPurchased += p.quantity;
    productAggMap[prodId].totalAmountSpent += p.totalPrice;
    if (new Date(p.date) >= new Date(productAggMap[prodId].lastPurchasedAt)) {
      productAggMap[prodId].lastPurchasedAt = p.date;
      productAggMap[prodId].lastUnitPrice = p.unitPrice;
      if (p.merchant) productAggMap[prodId].lastMerchant = p.merchant;
    }
  }

  // Compute average unit prices
  for (const item of Object.values(productAggMap)) {
    item.averageUnitPrice = Number((item.totalAmountSpent / Math.max(1, item.totalQuantityPurchased)).toFixed(2));
  }

  const allProductItems = Object.values(productAggMap).sort(
    (a, b) => b.totalPurchasesCount - a.totalPurchasesCount || b.totalAmountSpent - a.totalAmountSpent
  );

  // Frequently purchased products: strictly those with 2 or more purchases (frequency >= 2)
  const frequentProducts = allProductItems.filter(p => p.totalPurchasesCount >= 2);

  // 4. Repeated purchase callouts (e.g., "Purchased milk 2 times this month")
  const repeatInsights = frequentProducts.map(item => ({
    title: `Frequent Purchase: ${item.name}`,
    message: `You purchased ${item.name} ${item.totalPurchasesCount} times in this period and spent ₹${item.totalAmountSpent.toLocaleString('en-IN')}.`,
    productName: item.name,
    count: item.totalPurchasesCount,
    totalSpent: item.totalAmountSpent,
  }));

  // 5. Category intelligence insights
  const spendingAnalysis = [];
  const sortedSubcats = Object.entries(subcategoryStats).sort((a, b) => b[1] - a[1]);
  if (sortedSubcats.length > 0 && sortedSubcats[0][0] !== 'General') {
    spendingAnalysis.push(`Your highest grocery spending is on ${sortedSubcats[0][0].toLowerCase()} items (₹${sortedSubcats[0][1].toLocaleString('en-IN')}).`);
  }

  return {
    frequentProducts,      // Products with frequency >= 2
    allProducts: allProductItems, // All tracked products including 1x
    repeatInsights,
    categoryStats: Object.entries(categoryStats).map(([name, total]) => ({ name, total })),
    subcategoryStats: Object.entries(subcategoryStats).map(([name, total]) => ({ name, total })),
    spendingAnalysis,
    totalTrackedPurchases: purchasesInRange.length,
  };
};
