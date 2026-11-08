import Groq from 'groq-sdk';
import { Client } from 'langsmith';
import { traceable } from 'langsmith/traceable';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();
if (!process.env.GROQ_API_KEY) {
  dotenv.config({ path: path.join(process.cwd(), 'server', '.env') });
}

let groqClient = null;
let langsmithClient = null;

// Initialize LangSmith Observability if credentials are provided
const langsmithApiKey = process.env.LANGSMITH_API_KEY || process.env.LANGCHAIN_API_KEY;
if (langsmithApiKey && langsmithApiKey !== 'your_langsmith_api_key_here') {
  try {
    langsmithClient = new Client({
      apiUrl: process.env.LANGSMITH_ENDPOINT || process.env.LANGCHAIN_ENDPOINT || 'https://api.smith.langchain.com',
      apiKey: langsmithApiKey,
    });
    console.log(`✅ LangSmith Observability & Tracing initialized (Project: ${process.env.LANGSMITH_PROJECT || 'finwise-ai'}).`);
  } catch (err) {
    console.warn('⚠️ LangSmith initialization warning:', err.message);
  }
}

if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'your_groq_api_key_here') {
  const baseClient = new Groq({
    apiKey: process.env.GROQ_API_KEY,
  });

  // Automatically wrap Groq chat completions with LangSmith tracing
  if (langsmithClient) {
    const originalCreate = baseClient.chat.completions.create.bind(baseClient.chat.completions);
    baseClient.chat.completions.create = traceable(
      async (args) => {
        return await originalCreate(args);
      },
      {
        name: 'FinWise AI Groq Engine',
        run_type: 'llm',
        client: langsmithClient,
        project_name: process.env.LANGSMITH_PROJECT || process.env.LANGCHAIN_PROJECT || 'finwise-ai',
        metadata: {
          agent_id: process.env.LANGSMITH_AGENT_ID || 'finwise-ai',
          environment: process.env.LANGSMITH_AGENT_ENVIRONMENT || 'local',
          platform: 'FinWise AI Platform',
        },
      }
    );
  }

  groqClient = baseClient;
  console.log('✅ Groq SDK initialized with backend API key.');
} else {
  console.warn('⚠️ GROQ_API_KEY is not set or using placeholder in server/.env. AI features will run in intelligent rule-based / fallback mode until a valid Groq API key is provided.');
}

export const getGroqClient = () => groqClient;
export const getLangsmithClient = () => langsmithClient;

export const DEFAULT_GROQ_MODEL = process.env.GROQ_MODEL || 'qwen/qwen3.8-27b';
