import mongoose from 'mongoose';
import app from '../server/src/app.js';
import { connectDB } from '../server/src/config/db.js';

export default async function handler(req, res) {
  try {
    // Fast path for CORS preflight
    if (req.method === 'OPTIONS') {
      return app(req, res);
    }

    if (mongoose.connection.readyState !== 1) {
      await connectDB();
    }

    // Ensure the URL matches the Express /api mount points
    if (req.url && !req.url.startsWith('/api') && !req.url.startsWith('/uploads')) {
      req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
    }

    return app(req, res);
  } catch (error) {
    console.error('Unhandled Serverless Function Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal Server Error in Serverless Function',
    });
  }
}
