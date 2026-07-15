const fs = require('fs');
const { PDFParse } = require('pdf-parse');
const Chunk = require('../models/chunk.model');

let extractor = null;

async function getExtractor() {
  if (!extractor) {
    const { pipeline } = await import('@xenova/transformers');
    extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  return extractor;
}

/**
 * Extract text from TXT or PDF document.
 */
async function extractText(filePath, fileType) {
  if (fileType === 'txt') {
    return fs.readFileSync(filePath, 'utf-8');
  } else if (fileType === 'pdf') {
    const dataBuffer = fs.readFileSync(filePath);
    const parser = new PDFParse({ data: dataBuffer });
    const result = await parser.getText();
    await parser.destroy();
    return result.text;
  } else {
    throw new Error(`Unsupported file type: ${fileType}`);
  }
}

/**
 * Slide-window chunking by word count.
 */
function chunkText(text, chunkSize = 300, overlap = 50) {
  // Normalize whitespace
  const cleanText = text.replace(/\s+/g, ' ').trim();
  const words = cleanText.split(' ');
  const chunks = [];
  
  if (words.length <= chunkSize) {
    return [cleanText];
  }

  for (let i = 0; i < words.length; i += (chunkSize - overlap)) {
    const chunkWords = words.slice(i, i + chunkSize);
    const chunkText = chunkWords.join(' ').trim();
    if (chunkText) {
      chunks.push(chunkText);
    }
    // Stop if we've consumed the end of the text
    if (i + chunkSize >= words.length) break;
  }
  return chunks;
}

/**
 * Generate vector embedding for a given string locally using ONNX.
 */
async function generateEmbedding(text) {
  try {
    const pipe = await getExtractor();
    const output = await pipe(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
  } catch (err) {
    console.error("Local Embedding Error:", err.message);
    throw new Error(`Failed to generate local embedding: ${err.message}`);
  }
}

/**
 * Calculate cosine similarity between two vectors of equal length.
 */
function cosineSimilarity(vecA, vecB) {
  if (vecA.length !== vecB.length) {
    return 0;
  }
  let dotProduct = 0.0;
  let normA = 0.0;
  let normB = 0.0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Searches the user's chunks in MongoDB, ranks them by similarity to the query, and returns top K.
 */
async function searchSimilarChunks(userId, queryText, topK = 4) {
  try {
    // 1. Generate query embedding
    const queryEmbedding = await generateEmbedding(queryText);

    // 2. Fetch all chunks for this user from MongoDB
    // Note: In production, you would use MongoDB Atlas Vector Search ($vectorSearch index),
    // but computing similarity in memory works perfectly for a personal app/workspace.
    const userChunks = await Chunk.find({ userId }).populate('documentId');
    if (!userChunks || userChunks.length === 0) {
      return [];
    }

    // 3. Compute cosine similarity for each chunk
    const scoredChunks = userChunks.map(chunk => {
      const similarity = cosineSimilarity(queryEmbedding, chunk.embedding);
      return {
        chunk,
        score: similarity
      };
    });

    // 4. Sort and filter
    scoredChunks.sort((a, b) => b.score - a.score);

    // Return the top K items
    return scoredChunks.slice(0, topK).map(item => ({
      text: item.chunk.text,
      score: item.score,
      documentId: item.chunk.documentId?._id,
      filename: item.chunk.documentId?.filename || "Unknown Document"
    }));

  } catch (err) {
    console.error("Error in searchSimilarChunks:", err);
    return [];
  }
}

module.exports = {
  extractText,
  chunkText,
  generateEmbedding,
  cosineSimilarity,
  searchSimilarChunks
};
