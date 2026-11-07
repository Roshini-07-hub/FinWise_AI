import Product from '../models/Product.js';
import ProductPurchase from '../models/ProductPurchase.js';
import { getPurchaseIntelligence } from '../services/purchaseIntelligenceService.js';

// @route   GET /api/products/intelligence
export const getProductsIntelligence = async (req, res, next) => {
  try {
    const { timeFilter = 'this-month' } = req.query;
    const intelligence = await getPurchaseIntelligence(req.user._id, timeFilter);
    res.json({ success: true, data: intelligence });
  } catch (err) {
    next(err);
  }
};

// @route   GET /api/products/:id
export const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, userId: req.user._id }).lean();
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    const purchases = await ProductPurchase.find({ productId: product._id, userId: req.user._id })
      .sort({ date: -1 })
      .populate('transactionId', 'title amount date')
      .populate('receiptId', 'originalName fileUrl')
      .lean();

    res.json({
      success: true,
      data: {
        product,
        purchases,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @route   PUT /api/products/:id
export const updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, userId: req.user._id });
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    const { name, brand, category, subcategory, sizeOrVariant } = req.body;
    if (name) product.name = name;
    if (brand !== undefined) product.brand = brand;
    if (category) product.category = category;
    if (subcategory) product.subcategory = subcategory;
    if (sizeOrVariant !== undefined) product.sizeOrVariant = sizeOrVariant;

    await product.save();
    res.json({ success: true, data: product, message: 'Product details updated successfully.' });
  } catch (err) {
    next(err);
  }
};
