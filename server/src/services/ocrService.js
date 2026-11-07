import fs from 'fs';
import path from 'path';
import { createWorker } from 'tesseract.js';
import pdfParse from 'pdf-parse';
import { parseReceiptText, parseReceiptImage } from './aiService.js';

/**
 * Extract raw text from an image or PDF file
 */
export const extractTextFromFile = async (filePath, mimeType) => {
  if (mimeType === 'application/pdf') {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await pdfParse(dataBuffer);
      return pdfData.text || '';
    } catch (err) {
      console.error('PDF parsing error:', err.message);
      throw new Error(`Failed to extract text from PDF: ${err.message}`);
    }
  }

  // Use Tesseract.js for JPG, PNG, WEBP images
  let worker = null;
  try {
    worker = await createWorker('eng');
    const { data: { text } } = await worker.recognize(filePath);
    await worker.terminate();
    return text || '';
  } catch (err) {
    if (worker) {
      try { await worker.terminate(); } catch (e) {}
    }
    console.error('Tesseract OCR error:', err.message);
    return '';
  }
};

/**
 * Full receipt processing pipeline:
 * 1. For images: Primary high-accuracy Groq Multimodal Vision model
 * 2. Fallback to Tesseract OCR + LLM/Heuristic text parser
 * 3. For PDFs: pdf-parse + Groq structured extraction
 */
export const processReceiptFile = async (filePath, mimeType) => {
  console.log(`Processing receipt file: ${filePath} (${mimeType})`);

  // 1. If it's an image, attempt direct multimodal vision extraction first
  if (mimeType && mimeType.startsWith('image/')) {
    try {
      const visionResult = await parseReceiptImage(filePath, mimeType);
      if (visionResult && (visionResult.totalAmount > 0 || (visionResult.items && visionResult.items.length > 0))) {
        console.log('✅ Groq Vision extracted receipt structured data successfully.');
        return {
          rawText: `[Vision Extracted] ${visionResult.merchant} - Total: ${visionResult.totalAmount}`,
          structuredData: visionResult,
        };
      }
    } catch (visionErr) {
      console.warn('Groq Vision extraction attempt failed, continuing to OCR fallback:', visionErr.message);
    }
  }

  // 2. OCR text extraction pipeline (for PDFs or if vision unavailable)
  const rawText = await extractTextFromFile(filePath, mimeType);
  
  if (!rawText || rawText.trim().length === 0) {
    return {
      rawText: '',
      structuredData: {
        merchant: 'Unrecognized Store',
        billNumber: '',
        purchaseDate: new Date().toISOString().split('T')[0],
        totalAmount: 0,
        subtotal: 0,
        taxAmount: 0,
        discountAmount: 0,
        paymentMethod: 'UPI / GPay / PhonePe / Paytm',
        suggestedCategory: 'Groceries',
        items: []
      }
    };
  }

  const structuredData = await parseReceiptText(rawText);

  return {
    rawText,
    structuredData
  };
};
