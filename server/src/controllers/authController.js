import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'finwise_secret_jwt_key_2026', {
    expiresIn: '30d',
  });
};

// @route   POST /api/auth/register
export const register = async (req, res, next) => {
  try {
    const { name, email, password, currency, monthlyBudgetGoal } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide name, email, and password.' });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
    }

    const user = await User.create({
      name,
      email,
      password,
      currency: currency || { code: 'INR', symbol: '₹' },
      monthlyBudgetGoal: monthlyBudgetGoal || 50000,
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        currency: user.currency,
        monthlyBudgetGoal: user.monthlyBudgetGoal,
        token,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @route   POST /api/auth/login
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password.' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        currency: user.currency,
        monthlyBudgetGoal: user.monthlyBudgetGoal,
        token,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @route   GET /api/auth/me
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({
      success: true,
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

// @route   PUT /api/auth/profile
export const updateProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (req.body.name) user.name = req.body.name;
    if (req.body.currency) user.currency = req.body.currency;
    if (req.body.monthlyBudgetGoal !== undefined) user.monthlyBudgetGoal = req.body.monthlyBudgetGoal;

    await user.save();

    res.json({
      success: true,
      data: user,
    });
  } catch (err) {
    next(err);
  }
};
