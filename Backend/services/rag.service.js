/**
 * IRIS RAG Service: LangChain + local embeddings (Xenova/all-MiniLM-L6-v2) + Pinecone
 * ─────────────────────────────────────────────────────────────────────────────────
 *
 *   INGEST : PDFLoader / text ──▶ RecursiveCharacterTextSplitter ──▶ local MiniLM embedding
 *            ──▶ Pinecone upsert (namespace = userId)
 *   SEARCH : question ──▶ local MiniLM embedding ──▶ Pinecone similarity search (top K)
 *
 * Embeddings never leave the machine and cost nothing — `@xenova/transformers` runs the
 * model locally (ONNX) and is wrapped in a class extending LangChain's `Embeddings` base
 * class so it plugs into `PineconeStore` like any hosted embedding API would.
 *
 * Each user gets their own Pinecone namespace (`namespace = userId`), so one user's
 * documents are never searched for another user. The Pinecone index is created on first use
 * if it doesn't already exist (384 dims to match MiniLM, cosine, serverless).
 *
 * Pinecone is the single source of truth for chunks: each vector's metadata carries its text,
 * filename, page and chunk index, which is everything retrieval and citations need. Mongo only
 * keeps the parent `Document` (status, chunkCount); vector ids are `<documentId>_<chunkIndex>`,
 * so a document's vectors can be deleted from `chunkCount` alone.
 */
const { Document } = require('@langchain/core/documents');
const { Embeddings } = require('@langchain/core/embeddings');
const { BaseRetriever } = require('@langchain/core/retrievers');
const { PDFLoader } = require('@langchain/community/document_loaders/fs/pdf');
const { RecursiveCharacterTextSplitter } = require('@langchain/textsplitters');
const { Pinecone } = require('@pinecone-database/pinecone');
const { PineconeStore } = require('@langchain/pinecone');
const fs = require('fs');
const DocumentModel = require('../models/document.model');

const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 150;
const TOP_K = 4;
// Cosine similarity below this is treated as irrelevant. MiniLM scores run low on noisy PDF
// text (a correct match for "enrollment number" on a receipt scored 0.28), so keep this modest.
const MIN_SCORE = 0.2;
// A knowledge base this small is sent to the LLM whole — searching it only risks missing things.
const SMALL_KB_CHUNKS = 8;
// How many chunks a summary/overview question samples across the user's documents.
const OVERVIEW_CHUNKS = 8;
const EMBEDDING_DIMENSIONS = 384; // Xenova/all-MiniLM-L6-v2 output size

const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME || 'iris-docs-384';
const PINECONE_CLOUD = process.env.PINECONE_CLOUD || 'aws';
const PINECONE_REGION = process.env.PINECONE_REGION || 'us-east-1';

/* ─────────────────────── 1. Local embeddings (LangChain wrapper) ─────────────────────── */

/**
 * LangChain-compatible wrapper around the local Transformers.js MiniLM model.
 * Produces 384-dim, L2-normalised vectors. Plugs into `PineconeStore` like any embedding API.
 */
class LocalMiniLMEmbeddings extends Embeddings {
  constructor(fields = {}) {
    super(fields);
    this.modelName = fields.modelName || 'Xenova/all-MiniLM-L6-v2';
    this._pipelinePromise = null;
  }

  async _getPipeline() {
    if (!this._pipelinePromise) {
      this._pipelinePromise = import('@xenova/transformers')
        .then(({ pipeline }) => pipeline('feature-extraction', this.modelName))
        .catch((err) => {
          this._pipelinePromise = null; // allow retry on next call
          throw err;
        });
    }
    return this._pipelinePromise;
  }

  async embedDocuments(texts) {
    const pipe = await this._getPipeline();
    const vectors = [];
    const BATCH = 16;
    for (let i = 0; i < texts.length; i += BATCH) {
      const batch = texts.slice(i, i + BATCH);
      const output = await pipe(batch, { pooling: 'mean', normalize: true });
      vectors.push(...output.tolist());
    }
    return vectors;
  }

  async embedQuery(text) {
    const pipe = await this._getPipeline();
    const output = await pipe(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
  }
}

const embeddings = new LocalMiniLMEmbeddings();

/* ─────────────────────────── 2. Pinecone (auto-create index) ─────────────────────────── */

let pineconeClient = null;
let indexReadyPromise = null;

function getPineconeClient() {
  if (!pineconeClient) pineconeClient = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  return pineconeClient;
}

/** Create the index if it doesn't exist yet, then wait until Pinecone reports it ready. */
async function ensureIndex() {
  if (!indexReadyPromise) {
    indexReadyPromise = (async () => {
      const pc = getPineconeClient();
      const existing = await pc.listIndexes();
      const found = (existing.indexes || []).some((i) => i.name === PINECONE_INDEX_NAME);
      if (!found) {
        console.log(`[rag] Creating Pinecone index "${PINECONE_INDEX_NAME}" (${EMBEDDING_DIMENSIONS}d, cosine, serverless ${PINECONE_CLOUD}/${PINECONE_REGION})…`);
        await pc.createIndex({
          name: PINECONE_INDEX_NAME,
          dimension: EMBEDDING_DIMENSIONS,
          metric: 'cosine',
          spec: { serverless: { cloud: PINECONE_CLOUD, region: PINECONE_REGION } },
          waitUntilReady: true
        });
      }
    })().catch((err) => {
      indexReadyPromise = null; // allow retry on next call
      throw err;
    });
  }
  return indexReadyPromise;
}

async function getPineconeIndex() {
  await ensureIndex();
  return getPineconeClient().Index(PINECONE_INDEX_NAME);
}

function namespaceFor(userId) {
  return String(userId);
}

async function getVectorStore(userId) {
  const pineconeIndex = await getPineconeIndex();
  return new PineconeStore(embeddings, {
    pineconeIndex,
    namespace: namespaceFor(userId),
    maxConcurrency: 5
  });
}

/* ─────────────────────────── 3. Load the file ─────────────────────────── */

async function loadDocuments(filePath, fileType) {
  if (fileType === 'pdf') {
    const pdfLoader = new PDFLoader(filePath); // one Document per page
    return pdfLoader.load();
  }
  if (fileType === 'txt') {
    return [new Document({ pageContent: fs.readFileSync(filePath, 'utf-8'), metadata: {} })];
  }
  throw new Error(`Unsupported file type: ${fileType}`);
}

/* ─────────────────────────── 4. Split into chunks ─────────────────────── */

const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: CHUNK_SIZE,
  chunkOverlap: CHUNK_OVERLAP
});

async function splitDocuments(rawDocs) {
  const chunkedDocs = await textSplitter.splitDocuments(rawDocs);
  return chunkedDocs.filter((doc) => doc.pageContent.trim().length > 0);
}

/* ─────────────────────── 5. Ingest: embed + store ─────────────────────── */

/**
 * Load, split, embed (locally) and upsert one uploaded file into Pinecone. Returns the chunk
 * count; throws a user-readable error if the file has no extractable text.
 */
async function ingestDocument({ filePath, fileType, documentId, userId, filename }) {
  const rawDocs = await loadDocuments(filePath, fileType);
  const chunkedDocs = await splitDocuments(rawDocs);
  if (chunkedDocs.length === 0) {
    throw new Error(fileType === 'pdf'
      ? 'No extractable text found. Scanned/image-only PDFs are not supported yet.'
      : 'The file is empty.');
  }

  const docs = chunkedDocs.map((doc, i) => new Document({
    pageContent: doc.pageContent,
    metadata: {
      documentId: String(documentId),
      filename,
      chunkIndex: i,
      ...(doc.metadata?.loc?.pageNumber ? { page: doc.metadata.loc.pageNumber } : {})
    }
  }));
  const ids = docs.map((_, i) => `${documentId}_${i}`);

  const store = await getVectorStore(userId);
  try {
    await store.addDocuments(docs, { ids });
  } catch (err) {
    // don't leave a half-finished upload behind in Pinecone
    await deleteDocumentVectors({ userId, documentId, chunkCount: ids.length }).catch(() => {});
    throw err;
  }

  return docs.length;
}

/** Remove all vectors of a document from Pinecone. */
async function deleteDocumentVectors({ userId, documentId, chunkCount }) {
  if (!chunkCount) return;
  const ids = Array.from({ length: chunkCount }, (_, i) => `${documentId}_${i}`);
  const store = await getVectorStore(userId);
  for (let i = 0; i < ids.length; i += 1000) {
    await store.delete({ ids: ids.slice(i, i + 1000) });
  }
}

/* ─────────────────────────────── 6. Search ────────────────────────────── */

/** LangChain retriever over the user's Pinecone namespace; drops weak matches and keeps scores. */
class PineconeScoredRetriever extends BaseRetriever {
  static lc_name() {
    return 'PineconeScoredRetriever';
  }

  constructor(fields) {
    super(fields);
    this.lc_namespace = ['iris', 'retrievers'];
    this.userId = fields.userId;
    this.topK = fields.topK ?? TOP_K;
    this.minScore = fields.minScore ?? MIN_SCORE;
  }

  async _getRelevantDocuments(query) {
    return similaritySearch(this.userId, query, { topK: this.topK, minScore: this.minScore });
  }
}

function getRetriever(userId, options = {}) {
  return new PineconeScoredRetriever({ userId, ...options });
}

async function similaritySearch(userId, query, { topK = TOP_K, minScore = MIN_SCORE, documentIds } = {}) {
  const store = await getVectorStore(userId);
  const filter = documentIds?.length ? { documentId: { $in: documentIds.map(String) } } : undefined;
  const results = await store.similaritySearchWithScore(query, topK, filter);
  return results
    .filter(([, score]) => score >= minScore)
    .map(([doc, score]) => new Document({
      pageContent: doc.pageContent,
      metadata: { ...doc.metadata, score }
    }));
}

// "Summarize my document", "what is this file about", "key points" … — questions about a
// document as a whole contain no words from it, so similarity search can't find anything.
const OVERVIEW_PATTERN = /\b(summar\w*|overview|gist|tl;?dr|outline|key (points|takeaways|ideas)|main (points|ideas?|topics?|takeaways)|what('?s| is| are) (this|these|the|my) (document|file|pdf|doc|notes?|upload)s?|(about|describe|explain) (this|these|the|my) (document|file|pdf|doc|upload)s?)\b/i;

function isOverviewQuestion(question) {
  return OVERVIEW_PATTERN.test(question || '');
}

/** Ready documents whose name appears in the question (e.g. "summarize 6th sem.pdf"). */
function documentsNamedIn(question, docs) {
  const q = (question || '').toLowerCase();
  return docs.filter((d) => {
    const name = d.filename.toLowerCase();
    const stem = name.replace(/\.(pdf|txt)$/, '');
    return q.includes(name) || (stem.length >= 3 && q.includes(stem));
  });
}

/** Fetch chunks by id: the opening chunks plus an even spread through the rest. */
async function sampleDocumentChunks(userId, doc, budget) {
  const count = doc.chunkCount || 0;
  if (!count || budget <= 0) return [];
  const picks = new Set();
  const opening = Math.min(count, Math.max(1, Math.ceil(budget / 2)));
  for (let i = 0; i < opening; i++) picks.add(i);
  const remaining = Math.min(budget, count) - picks.size;
  for (let k = 1; k <= remaining; k++) picks.add(Math.floor((k * count) / (remaining + 1)));

  const ids = [...picks].sort((a, b) => a - b).map((i) => `${doc._id}_${i}`);
  const index = await getPineconeIndex();
  const { records = {} } = await index.namespace(namespaceFor(userId)).fetch(ids);
  return ids
    .map((id) => records[id])
    .filter(Boolean)
    .map((rec) => {
      const { text, ...meta } = rec.metadata || {};
      return new Document({ pageContent: text || '', metadata: { ...meta, filename: meta.filename || doc.filename } });
    })
    .filter((d) => d.pageContent);
}

/**
 * Pick the context passages for a Docs-mode question.
 *   - small knowledge base            → every chunk
 *   - summary/overview question       → sampled chunks across the (named or most recent) documents
 *   - specific question               → similarity search (limited to named documents, if any)
 * Returns { documents, strategy, readyDocs }.
 */
async function retrieveContext(userId, { question, searchQuery }) {
  const readyDocs = await DocumentModel.find({ userId, status: 'ready' }).sort({ createdAt: -1 }).lean();
  if (!readyDocs.length) return { documents: [], strategy: 'none', readyDocs };

  const named = documentsNamedIn(question, readyDocs);
  const scope = named.length ? named : readyDocs;
  const totalChunks = scope.reduce((n, d) => n + (d.chunkCount || 0), 0);

  if (totalChunks <= SMALL_KB_CHUNKS || isOverviewQuestion(question)) {
    const targets = scope.slice(0, 3);
    const perDoc = Math.max(2, Math.floor(OVERVIEW_CHUNKS / targets.length));
    const chunks = (await Promise.all(targets.map((d) => sampleDocumentChunks(userId, d, perDoc)))).flat();
    return { documents: chunks, strategy: totalChunks <= SMALL_KB_CHUNKS ? 'all' : 'overview', readyDocs };
  }

  const documents = await similaritySearch(userId, searchQuery || question, {
    documentIds: named.length ? named.map((d) => d._id) : undefined
  });
  return { documents, strategy: 'similarity', readyDocs };
}

async function userHasReadyDocuments(userId) {
  return !!(await DocumentModel.exists({ userId, status: 'ready' }));
}

/* ───────────────────────────── 7. Formatting ──────────────────────────── */

/** Numbered context block for the prompt: the LLM cites chunks as [1], [2], ... */
function formatDocsForPrompt(docs) {
  return docs.map((d, i) => {
    const page = d.metadata.page ? `, page ${d.metadata.page}` : '';
    return `[${i + 1}] (${d.metadata.filename}${page})\n${d.pageContent}`;
  }).join('\n\n---\n\n');
}

/** Source objects stored on the assistant message and rendered as citation cards. */
function docsToSources(docs) {
  return docs.map((d, i) => ({
    index: i + 1,
    documentId: d.metadata.documentId,
    filename: d.metadata.filename,
    page: d.metadata.page,
    chunkText: d.pageContent,
    score: d.metadata.score
  }));
}

module.exports = {
  EMBEDDING_DIMENSIONS,
  LocalMiniLMEmbeddings,
  embeddings,
  loadDocuments,
  splitDocuments,
  ingestDocument,
  deleteDocumentVectors,
  getRetriever,
  retrieveContext,
  isOverviewQuestion,
  userHasReadyDocuments,
  formatDocsForPrompt,
  docsToSources
};
