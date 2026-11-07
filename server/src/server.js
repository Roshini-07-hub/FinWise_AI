import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import { connectDB } from './config/db.js';
import { initChroma } from './config/chroma.js';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // 1. Connect database
    await connectDB();

    // 2. Initialize ChromaDB vector service
    await initChroma();

    // 3. Start Express HTTP server
    app.listen(PORT, () => {
      console.log(`===============================================`);
      console.log(`🚀 FinWise AI Server listening on port ${PORT}`);
      console.log(`📡 Healthcheck: http://localhost:${PORT}/api/health`);
      console.log(`===============================================`);
    });
  } catch (err) {
    console.error('Fatal error during server startup:', err);
    process.exit(1);
  }
};

startServer();
