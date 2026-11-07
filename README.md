# FinWise_AI – Smart Expense Tracker & Financial Intelligence Platform

FinWise AI is a complete, production-quality, responsive personal financial intelligence platform. Designed with a modern fintech aesthetic (inspired by Stripe, Ramp, and Linear), FinWise AI empowers users to track income and expenses, scan bills with AI OCR, set dynamic category budgets, detect frequently purchased products, and converse with an AI financial assistant that reasons over verified database figures.

---

## 🚀 Key Features

### 1. Dashboard & Financial Overview
- **Dynamic Calculation Engine**: Calculates Total Balance, Total Income, Total Expenses, Remaining Budget, and Net Savings directly from verified MongoDB records.
- **Visual Analytics with Recharts**:
  - Interactive daily income vs. expense trend lines.
  - Category-wise expense donut breakdowns with proportional tooltips.
  - Previous month comparison metrics (percentage change and absolute differences).
- **Dynamic Budget Tracker**: Live progress bar indicating consumption levels (<70% Emerald, 70–90% Amber, >90% Rose alert).
- **Recent Activity Ledger**: Transaction audit log with category pills and receipt attachment indicators.

### 2. Transaction Management & CSV Export
- **Full CRUD Management**: Create, view, edit, and delete transactions.
- **Multi-parameter Filtering**: Filter by category, transaction type (income/expense), payment method, and custom date ranges.
- **Hybrid Search**: Instant text search plus toggleable **Vector AI Semantic Search** powered by ChromaDB embeddings.
- **RFC-4180 CSV Export**: One-click download of filtered or full transaction histories.

### 3. Receipt & Bill Image Upload with AI OCR
- **Supported Formats**: JPG, JPEG, PNG, WEBP, and PDF documents up to 10MB.
- **OCR Pipeline**: Dual-engine text extraction (Tesseract.js for images + PDF parser) piped into Groq's high-speed inference engine.
- **Structured Data Extraction**:
  - Merchant / Store Name
  - Bill / Invoice Number
  - Purchase Date
  - Subtotal, Tax Amount, and Grand Total
  - Payment Method
  - Itemized Product Line Items (Product name, quantity, unit price, item total)
- **Human-in-the-Loop Verification**: A split view displays the receipt preview side-by-side with an editable form. **Transactions and line items are never auto-saved without explicit user confirmation.**

### 4. Smart Product Detection & Purchase Intelligence
- **AI Product Normalization**: Groq AI normalizes receipt items into canonical products while preserving brand, variant, and container size (e.g., *"Amul Taaza Milk 500ml"* vs. *"Amul toned milk"*).
- **ChromaDB Vector Matching**: Semantic embeddings prevent duplicate catalog creation and associate related aliases.
- **Repeat Purchase Detection**: Pinpoints recurring purchases (e.g., *"You purchased milk 12 times this month and spent ₹392"*).
- **Product Spending Analysis**: Identifies dominant grocery subcategories (e.g., dairy, cooking oils, beverages).
- **User Corrections**: Dedicated interface allowing users to adjust normalized names, brands, or categories.

### 5. Monthly Budget Management
- **Total & Category Limits**: Set global monthly caps as well as category-specific targets (Food & Dining, Groceries, Shopping, etc.).
- **Threshold Alerts**: Automatic system warnings at 70%, 90%, and 100%+ (budget exceeded).
- **Refund Policy Clarification**: Inflows and reimbursements are credited to overall liquid balance rather than artificially lowering expense records.

### 6. AI Before-You-Buy Assistant
- **Pre-Purchase Feasibility Engine**: Evaluates prospective purchases against live monthly budgets, current cashflow, and spending capacity before you spend.
- **Affordability Decisioning**: Generates definitive guidance (`AFFORDABLE`, `AFFORDABLE WITH CAUTION`, `WAIT AND SAVE`, `NOT RECOMMENDED RIGHT NOW`) with scores from 0–100.
- **Simulated Financial Impact**: Displays side-by-side Before vs. After financial cards and interactive Recharts comparisons.
- **Personalized Savings Plan**: Formulates monthly contribution schedules, timeline completion estimates, and interactive savings sliders.
- **Evaluation History**: Persists previous evaluations with one-click review and management.

### 7. AI Financial Assistant / Chatbot
- **Natural Language Inquiries**: Ask questions such as *"How much did I spend on food this month?"*, *"What are my top 5 expenses?"*, or *"How much did I save?"*.
- **Verified Truth Principle**: The backend calculates ground-truth figures directly from MongoDB; Groq AI interprets and explains verified numbers without hallucinating financial facts.
- **Chat History & Quick Prompts**: Persistent conversation history with instant prompt suggestion chips.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, Vite, Tailwind CSS, React Router DOM 7, Recharts, Lucide React, Axios |
| **Backend** | Node.js (v22), Express.js (v4), JWT Auth, bcryptjs, Multer, Helmet, Rate Limiter |
| **AI & LLM** | Groq API (`llama-3.3-70b-versatile`) |
| **OCR Engine** | Tesseract.js (Images) & PDF-Parse (Documents) |
| **Structured Database** | MongoDB Atlas (with automatic in-memory fallback for local development) |
| **Vector Store** | ChromaDB (Cloud / Hosted with resilient embedded cosine-similarity fallback) |
| **Deployment** | Vercel (Serverless API + Frontend), Render / Railway (Docker container) |

---

## 📁 Project Structure

```
finwise_AI/
├── api/
│   └── index.js              # Vercel serverless Express adapter
├── client/                   # Vite React Frontend
│   ├── src/
│   │   ├── components/       # Reusable UI (Sidebar, Navbar, Modals)
│   │   ├── context/          # AuthContext, FinanceContext
│   │   ├── layouts/          # AppLayout
│   │   ├── pages/            # Overview, Transactions, Receipts, Budgets, Analytics, Products, Assistant, Settings, Login, Register
│   │   ├── services/         # Axios API Client
│   │   ├── App.jsx           # Routing & Guards
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
├── server/                   # Express REST API Backend
│   ├── src/
│   │   ├── config/           # db.js, groq.js, chroma.js, constants.js
│   │   ├── controllers/      # auth, transaction, receipt, budget, product, insight, chat, analytics
│   │   ├── middleware/       # auth.js, errorHandler.js, upload.js
│   │   ├── models/           # User, Transaction, Category, Budget, Receipt, ReceiptItem, Product, ProductPurchase, AiInsight, ChatMessage
│   │   ├── routes/           # REST endpoints
│   │   ├── services/         # aiService, ocrService, vectorService, purchaseIntelligenceService, budgetService, financialAnalyticsService, csvExportService
│   │   ├── utils/            # seedData.js
│   │   ├── app.js
│   │   └── server.js
│   ├── .env.example
│   └── package.json
├── Dockerfile                # Multi-stage production container
├── render.yaml               # Render Blueprint configuration
├── vercel.json               # Vercel deployment configuration
├── package.json              # Monorepo root scripts (concurrently)
└── README.md
```

---

## ⚡ Quick Start

### 1. Prerequisites
- Node.js (v18 or higher; v22 recommended)
- npm or pnpm

### 2. Environment Configuration
Create `server/.env` (or copy from `server/.env.example`):
```env
PORT=5000
NODE_ENV=development
JWT_SECRET=your_secure_jwt_secret_key_here

# Groq API Key (https://console.groq.com)
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile

# MongoDB Atlas URI (Optional; automatically starts embedded Mongo if omitted)
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/finwise_ai?retryWrites=true&w=majority

# ChromaDB Host (Optional; embedded vector memory store runs by default)
CHROMA_SERVER_HOST=
CHROMA_API_KEY=
```

### 3. Run Development Server
From the project root:
```bash
# Run both Backend API (port 5000) and Frontend (port 3000) concurrently
npm run dev
```

Or run individually:
```bash
# Terminal 1: Backend
npm run server

# Terminal 2: Frontend
npm run client
```

Open `http://localhost:3000` in your browser.

---

## 🔑 Demo Account (Pre-Seeded)

The database automatically seeds sample data on the first run:
- **Email**: `demo@finwise.ai`
- **Password**: `Password@123`

You can also click the **"Use Demo Account"** button on the login screen for instant access.

---

## 📡 REST API Reference

### Authentication
- `POST /api/auth/register` - Create new user account
- `POST /api/auth/login` - Authenticate user & receive JWT
- `GET /api/auth/me` - Retrieve authenticated user profile
- `PUT /api/auth/profile` - Update name, currency, or monthly budget goal

### Transactions
- `GET /api/transactions` - Filter, search, and paginate transactions
- `POST /api/transactions` - Create transaction (with optional AI auto-categorization)
- `POST /api/transactions/auto-categorize` - Predict category & merchant as user types
- `GET /api/transactions/:id` - Fetch transaction details
- `PUT /api/transactions/:id` - Update transaction
- `DELETE /api/transactions/:id` - Delete transaction

### Receipts & OCR
- `POST /api/receipts/upload` - Upload receipt image/PDF, run OCR, extract structured JSON
- `POST /api/receipts/:id/confirm` - User-verified confirmation saving transaction & products
- `GET /api/receipts` - List uploaded receipts
- `GET /api/receipts/:id` - Fetch receipt with itemized line items

### Budgets
- `GET /api/budgets/overview?month=YYYY-MM` - Fetch budget progress and threshold notifications
- `POST /api/budgets` - Set/update overall or category budget limit
- `DELETE /api/budgets/:id` - Delete category budget

### Purchase Intelligence
- `GET /api/products/intelligence` - Retrieve frequent products, repeated items, and category insights
- `PUT /api/products/:id` - Correct product name, brand, or category mapping

### AI Financial Assistant
- `POST /api/chat/message` - Ask financial question, calculates DB metrics & returns explanation
- `GET /api/chat/history` - Retrieve session conversation history
- `DELETE /api/chat/clear` - Clear conversation

### Analytics & Export
- `GET /api/analytics/dashboard` - Summary cards, cash flow trend, category breakdown
- `GET /api/analytics/charts` - Period-filtered charts (This Week, Month, 3M, 6M)
- `GET /api/analytics/export-csv` - Download RFC-4180 CSV export

---

## 🔒 Security Implementation
1. **User-Level Data Isolation**: Every database query enforces `{ userId: req.user._id }`.
2. **Password Security**: Strong salt rounds with `bcryptjs`.
3. **Stateless JWT**: Secure token verification middleware with automatic session expiration handling.
4. **API Protection**: `helmet` headers, strict CORS configuration, and `express-rate-limit`.
5. **No Key Leakage**: Groq API keys remain strictly server-side.

---

## 📄 License
MIT License. Built for modern financial intelligence.
