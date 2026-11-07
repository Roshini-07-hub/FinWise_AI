import Groq from 'groq-sdk';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();
if (!process.env.GROQ_API_KEY) {
  dotenv.config({ path: path.join(process.cwd(), 'server', '.env') });
}

let groqClient = null;

if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'your_groq_api_key_here') {
  groqClient = new Groq({
    apiKey: process.env.GROQ_API_KEY,
  });
  console.log('✅ Groq SDK initialized with backend API key.');
} else {
  console.warn('⚠️ GROQ_API_KEY is not set or using placeholder in server/.env. AI features will run in intelligent rule-based / fallback mode until a valid Groq API key is provided.');
}

export const getGroqClient = () => groqClient;

export const DEFAULT_GROQ_MODEL = process.env.GROQ_MODEL || 'qwen/qwen3.8-27b';
