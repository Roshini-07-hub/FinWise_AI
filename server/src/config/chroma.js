import { ChromaClient } from 'chromadb';
import dotenv from 'dotenv';
dotenv.config();

let chromaClient = null;
let isChromaConnected = false;

// Fallback in-memory vector store in case hosted ChromaDB is not yet provisioned
class FallbackVectorCollection {
  constructor(name) {
    this.name = name;
    this.documents = []; // { id, document, metadata, embedding }
  }

  // Simple cosine similarity calculation
  static cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async add({ ids, documents, metadatas, embeddings }) {
    for (let i = 0; i < ids.length; i++) {
      const existingIdx = this.documents.findIndex(d => d.id === ids[i]);
      const record = {
        id: ids[i],
        document: documents ? documents[i] : '',
        metadata: metadatas ? metadatas[i] : {},
        embedding: embeddings ? embeddings[i] : null
      };
      if (existingIdx >= 0) {
        this.documents[existingIdx] = record;
      } else {
        this.documents.push(record);
      }
    }
    return true;
  }

  async query({ queryEmbeddings, queryTexts, nResults = 5, where = {} }) {
    let filtered = [...this.documents];

    // Filter by 'where' metadata (e.g. user_id)
    if (where && Object.keys(where).length > 0) {
      filtered = filtered.filter(doc => {
        for (const [key, val] of Object.entries(where)) {
          if (doc.metadata && doc.metadata[key] !== val) return false;
        }
        return true;
      });
    }

    // Rank by query text or embedding
    let scored = filtered.map(item => {
      let score = 0;
      if (queryEmbeddings && queryEmbeddings[0] && item.embedding) {
        score = FallbackVectorCollection.cosineSimilarity(queryEmbeddings[0], item.embedding);
      } else if (queryTexts && queryTexts[0]) {
        // Simple token overlap
        const qWords = queryTexts[0].toLowerCase().split(/\s+/);
        const docWords = (item.document || '').toLowerCase().split(/\s+/);
        const matches = qWords.filter(w => docWords.includes(w)).length;
        score = matches / Math.max(qWords.length, 1);
      }
      return { item, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, nResults);

    return {
      ids: [top.map(t => t.item.id)],
      documents: [top.map(t => t.item.document)],
      metadatas: [top.map(t => t.item.metadata)],
      distances: [top.map(t => 1 - t.score)]
    };
  }

  async delete({ ids, where }) {
    if (ids) {
      this.documents = this.documents.filter(d => !ids.includes(d.id));
    }
    if (where) {
      this.documents = this.documents.filter(d => {
        for (const [k, v] of Object.entries(where)) {
          if (d.metadata[k] === v) return false;
        }
        return true;
      });
    }
    return true;
  }
}

const fallbackCollections = new Map();

export const initChroma = async () => {
  const chromaHost = process.env.CHROMA_HOST || process.env.CHROMA_SERVER_HOST;
  const chromaApiKey = process.env.CHROMA_API_KEY;
  const chromaTenant = process.env.CHROMA_TENANT;
  const chromaDatabase = process.env.CHROMA_DATABASE;

  if (chromaHost) {
    try {
      const fullPath = chromaHost.startsWith('http') ? chromaHost : `https://${chromaHost}`;
      console.log(`Connecting to ChromaDB at ${fullPath}...`);
      chromaClient = new ChromaClient({
        path: fullPath,
        headers: chromaApiKey ? {
          'x-chroma-token': chromaApiKey,
          'Authorization': `Bearer ${chromaApiKey}`
        } : undefined,
        auth: chromaApiKey ? { provider: 'token', credentials: chromaApiKey } : undefined,
        tenant: chromaTenant || undefined,
        database: chromaDatabase || undefined,
      });
      await chromaClient.heartbeat();
      isChromaConnected = true;
      console.log('✅ Connected to external/hosted ChromaDB successfully.');
      return chromaClient;
    } catch (err) {
      console.warn(`⚠️ Could not reach ChromaDB host (${err.message}). Using resilient in-memory vector store fallback.`);
    }
  } else {
    console.log('💡 ChromaDB host not configured. Utilizing resilient semantic vector store fallback for product matching and embeddings.');
  }

  isChromaConnected = false;
  return null;
};

export const getOrCreateCollection = async (collectionName) => {
  if (isChromaConnected && chromaClient) {
    try {
      return await chromaClient.getOrCreateCollection({ name: collectionName });
    } catch (err) {
      console.error(`Failed to get/create Chroma collection '${collectionName}':`, err.message);
    }
  }

  if (!fallbackCollections.has(collectionName)) {
    fallbackCollections.set(collectionName, new FallbackVectorCollection(collectionName));
  }
  return fallbackCollections.get(collectionName);
};

export const isChromaLive = () => isChromaConnected;
