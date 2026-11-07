import { getOrCreateCollection } from '../config/chroma.js';

// Simple lightweight 384-dim semantic hash embedding function for offline/hosted embedding generation
const generateSimpleEmbedding = (text) => {
  const dim = 128;
  const embedding = new Array(dim).fill(0);
  const normalized = text.toLowerCase().trim();
  const tokens = normalized.split(/\s+/);

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    let hash = 0;
    for (let j = 0; j < token.length; j++) {
      hash = ((hash << 5) - hash) + token.charCodeAt(j);
      hash |= 0;
    }
    const idx = Math.abs(hash) % dim;
    embedding[idx] += 1 / (i + 1);
  }

  // Normalize vector
  const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  return norm > 0 ? embedding.map(v => v / norm) : embedding;
};

/**
 * Upsert product embedding to ChromaDB
 */
export const indexProductEmbedding = async ({
  userId,
  productId,
  productName,
  normalizedKey,
  brand,
  category,
  merchant
}) => {
  try {
    const collection = await getOrCreateCollection('product_embeddings');
    const docText = `${productName} ${normalizedKey} ${brand} ${category} ${merchant}`.trim();
    const embedding = generateSimpleEmbedding(docText);

    await collection.add({
      ids: [`prod_${productId}`],
      documents: [docText],
      metadatas: [{
        user_id: String(userId),
        product_id: String(productId),
        product_name: productName,
        normalized_key: normalizedKey,
        brand: brand || '',
        category: category || 'Groceries',
        merchant: merchant || '',
      }],
      embeddings: [embedding]
    });
  } catch (err) {
    console.error('Error indexing product embedding:', err.message);
  }
};

/**
 * Find semantically similar products for a user to detect variants and prevent duplicates
 */
export const findSimilarProducts = async ({ userId, queryText, limit = 3 }) => {
  try {
    const collection = await getOrCreateCollection('product_embeddings');
    const embedding = generateSimpleEmbedding(queryText);

    const results = await collection.query({
      queryEmbeddings: [embedding],
      queryTexts: [queryText],
      nResults: limit,
      where: { user_id: String(userId) }
    });

    const matches = [];
    if (results && results.ids && results.ids[0]) {
      for (let i = 0; i < results.ids[0].length; i++) {
        const distance = results.distances ? results.distances[0][i] : 1;
        // distance close to 0 or similarity > 0.65
        const similarity = 1 - distance;
        matches.push({
          id: results.ids[0][i],
          document: results.documents[0][i],
          metadata: results.metadatas[0][i],
          similarity
        });
      }
    }

    return matches;
  } catch (err) {
    console.error('Error querying similar products:', err.message);
    return [];
  }
};

/**
 * Index transaction for semantic search
 */
export const indexTransactionEmbedding = async ({
  userId,
  transactionId,
  title,
  merchant,
  category,
  notes,
  amount,
  date
}) => {
  try {
    const collection = await getOrCreateCollection('transaction_embeddings');
    const docText = `${title} ${merchant} ${category} ${notes}`.trim();
    const embedding = generateSimpleEmbedding(docText);

    await collection.add({
      ids: [`tx_${transactionId}`],
      documents: [docText],
      metadatas: [{
        user_id: String(userId),
        transaction_id: String(transactionId),
        merchant: merchant || '',
        category: category || '',
        amount: Number(amount) || 0,
        purchase_date: date ? new Date(date).toISOString() : new Date().toISOString(),
      }],
      embeddings: [embedding]
    });
  } catch (err) {
    console.error('Error indexing transaction embedding:', err.message);
  }
};

/**
 * Semantic search for transactions
 */
export const searchSemanticTransactions = async ({ userId, queryText, limit = 10 }) => {
  try {
    const collection = await getOrCreateCollection('transaction_embeddings');
    const embedding = generateSimpleEmbedding(queryText);

    const results = await collection.query({
      queryEmbeddings: [embedding],
      queryTexts: [queryText],
      nResults: limit,
      where: { user_id: String(userId) }
    });

    const matches = [];
    if (results && results.ids && results.ids[0]) {
      for (let i = 0; i < results.ids[0].length; i++) {
        matches.push({
          transactionId: results.metadatas[0][i]?.transaction_id,
          metadata: results.metadatas[0][i],
          similarity: 1 - (results.distances ? results.distances[0][i] : 1)
        });
      }
    }
    return matches;
  } catch (err) {
    console.error('Error performing semantic transaction search:', err.message);
    return [];
  }
};
