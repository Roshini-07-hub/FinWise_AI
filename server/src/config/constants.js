export const PREDEFINED_CATEGORIES = [
  { name: 'Food & Dining', icon: 'Utensils', color: '#f59e0b', type: 'expense' },
  { name: 'Groceries', icon: 'ShoppingCart', color: '#10b981', type: 'expense' },
  { name: 'Transportation', icon: 'Car', color: '#3b82f6', type: 'expense' },
  { name: 'Shopping', icon: 'ShoppingBag', color: '#ec4899', type: 'expense' },
  { name: 'Entertainment', icon: 'Film', color: '#8b5cf6', type: 'expense' },
  { name: 'Healthcare', icon: 'HeartPulse', color: '#ef4444', type: 'expense' },
  { name: 'Education', icon: 'GraduationCap', color: '#06b6d4', type: 'expense' },
  { name: 'Utilities', icon: 'Zap', color: '#eab308', type: 'expense' },
  { name: 'Rent', icon: 'Home', color: '#6366f1', type: 'expense' },
  { name: 'Travel', icon: 'Plane', color: '#14b8a6', type: 'expense' },
  { name: 'Personal Care', icon: 'Sparkles', color: '#f43f5e', type: 'expense' },
  { name: 'Subscriptions', icon: 'RotateCw', color: '#84cc16', type: 'expense' },
  { name: 'Salary', icon: 'Briefcase', color: '#10b981', type: 'income' },
  { name: 'Freelance Income', icon: 'Laptop', color: '#3b82f6', type: 'income' },
  { name: 'Investment Income', icon: 'TrendingUp', color: '#8b5cf6', type: 'income' },
  { name: 'Other', icon: 'MoreHorizontal', color: '#64748b', type: 'expense' }
];

export const PAYMENT_METHODS = [
  'UPI / GPay / PhonePe / Paytm',
  'Credit Card',
  'Debit Card',
  'Net Banking',
  'Cash',
  'Wallet',
  'Cheque',
  'Other'
];

export const DETERMINISTIC_MERCHANTS = [
  // Food & Dining / Delivery
  { regex: /swiggy|zomato|mcdonald|kfc|starbucks|domino|pizza hut|subway|haldiram|burger king|cafe coffee day/i, category: 'Food & Dining', title: 'Food & Dining' },
  // Groceries
  { regex: /blinkit|zepto|bigbasket|instamart|dmart|spencer|reliance fresh|nature's basket|dunzo|milk basket|more retail/i, category: 'Groceries', title: 'Groceries' },
  // Transportation
  { regex: /uber|ola|rapido|metro|irctc|indian railways|makemytrip|redbus|fastag|hp petrol|indianoil|bharat petroleum|shell|fuel/i, category: 'Transportation', title: 'Transportation' },
  // Shopping
  { regex: /amazon|flipkart|myntra|ajio|zara|h&m|uniqlo|meesho|tata cliq|nykaa|croma|reliance digital/i, category: 'Shopping', title: 'Online Shopping' },
  // Entertainment
  { regex: /netflix|hotstar|disney|spotify|youtube|prime video|bookmyshow|pvr|inox|sony liv/i, category: 'Entertainment', title: 'Entertainment' },
  // Utilities
  { regex: /bescom|tata power|mahadiscom|electricity|adani electricity|airtel|jio|vi |vodafone|broadband|act fibernet|tata play|gas bill|indraprastha gas|water bill/i, category: 'Utilities', title: 'Utility Bill' },
  // Healthcare
  { regex: /apollo|pharmeasy|1mg|netmeds|medplus|practo|hospital|clinic|diagnostic|dr lal pathlabs/i, category: 'Healthcare', title: 'Medical & Healthcare' },
  // Subscriptions
  { regex: /chatgpt|openai|github|google one|icloud|adobe|canva|linkedin|medium|microsoft 365/i, category: 'Subscriptions', title: 'Software Subscription' },
  // Personal Care
  { regex: /salon|spa|urban company|lakme|enrich|vlcc|cult\.fit|gym|fitness/i, category: 'Personal Care', title: 'Personal Care & Fitness' }
];

export const SUPPORTED_CURRENCIES = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' }
];
