/**
 * MediAgent Enhanced Vector Store Service
 *
 * Builds on the existing TF-IDF vector-search infrastructure (see
 * server/knowledge/medicalKB.js) and extends it to the curated,
 * chunked knowledge-base documents produced by the ingestion pipeline.
 *
 * Design notes (Task 6):
 *  - No external embedding model or FAISS dependency is introduced, because
 *    neither is installed in this environment and native-module compilation
 *    is blocked. The existing pure-JS TF-IDF approach is preserved and
 *    enhanced rather than replaced.
 *  - Retrieval is disease-aware: results are scoped to the relevant disease
 *    knowledge base, with optional cross-disease keyword fallback.
 *  - Hybrid scoring combines TF-IDF semantic similarity with explicit
 *    keyword overlap, then de-duplicates by source and enforces source
 *    diversity.
 *  - No patient-identifying information is logged or embedded.
 */

const fs = require('fs');
const path = require('path');
const { loadAllDocuments, SUPPORTED_DISEASES, RETRIEVAL_DATE } = require('../knowledge/index');

const DEFAULT_TOP_K = 5;
const MIN_RELEVANCE = 0.05;
const DEFAULT_DIVERSITY_LIMIT = 2; // max chunks per source in top results

// Lightweight English stop-words for keyword overlap scoring.
const STOP_WORDS = new Set([
  'the','a','an','and','or','but','if','then','else','when','is','are','was','were',
  'be','been','being','have','has','had','do','does','did','will','would','could',
  'should','may','might','must','can','to','of','in','for','on','with','at','by',
  'from','as','into','through','during','before','after','above','below','between',
  'under','again','further','each','few','more','most','other','some','such','no',
  'nor','not','only','own','same','so','than','too','very','just','don','now','i',
  'me','my','myself','we','our','ours','you','your','yours','he','him','his','she',
  'her','hers','it','its','they','them','their','what','which','who','whom','this',
  'that','these','those','am'
]);

function tokenize(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

function buildTfIdf(docs) {
  const N = docs.length;
  const df = {};
  // Accept either raw strings or objects with a .text field.
  const docTokens = docs.map((d) => tokenize(typeof d === 'string' ? d : d.text));
  docTokens.forEach((tokens) => {
    new Set(tokens).forEach((t) => { df[t] = (df[t] || 0) + 1; });
  });
  const idf = {};
  Object.keys(df).forEach((t) => { idf[t] = Math.log(N / Math.max(1, df[t])); });
  const vectors = docTokens.map((tokens) => {
    const tf = {};
    tokens.forEach((t) => { tf[t] = (tf[t] || 0) + 1; });
    const maxTf = Math.max(...Object.values(tf), 1);
    const vec = {};
    Object.keys(tf).forEach((t) => { vec[t] = (tf[t] / maxTf) * (idf[t] || 0); });
    return vec;
  });
  return { vectors, idf, docTokens };
}

function cosineSim(qVec, dVec) {
  const keys = new Set([...Object.keys(qVec), ...Object.keys(dVec)]);
  let dot = 0, na = 0, nb = 0;
  keys.forEach((k) => {
    const a = qVec[k] || 0, b = dVec[k] || 0;
    dot += a * b; na += a * a; nb += b * b;
  });
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom ? dot / denom : 0;
}

function keywordOverlap(queryTokens, docTokens) {
  const qSet = new Set(queryTokens);
  const docSet = new Set(docTokens);
  let overlap = 0;
  docSet.forEach((t) => { if (qSet.has(t)) overlap++; });
  return queryTokens.length ? overlap / queryTokens.length : 0;
}

/**
 * Enhanced Vector Store backed by chunked knowledge-base documents.
 */
class VectorStore {
  constructor() {
    this.docs = []; // { chunkId, text, disease, sourceId, title, organization, url, publicationDate, documentType, topic, chunkIndex, metadata }
    this.index = null; // { vectors, idf, docTokens }
    this.built = false;
    this.buildError = null;
  }

  /**
   * Load all chunked documents from the knowledge base and build the index.
   */
  build() {
    this.docs = [];
    const allDocs = loadAllDocuments();
    SUPPORTED_DISEASES.forEach((disease) => {
      (allDocs[disease] || []).forEach((doc) => {
        (doc.chunks || []).forEach((chunk) => {
          this.docs.push({
            chunkId: chunk.chunkId,
            text: chunk.text,
            disease: doc.disease || disease,
            sourceId: doc.sourceId || doc.id,
            title: doc.title,
            organization: doc.organization,
            url: doc.url,
            publicationDate: doc.publicationDate,
            documentType: doc.documentType,
            topic: doc.topic,
            chunkIndex: chunk.chunkIndex,
            metadata: chunk.metadata || doc.metadata || {},
          });
        });
      });
    });

    if (this.docs.length === 0) {
      this.index = { vectors: [], idf: {}, docTokens: [] };
      this.built = true;
      return;
    }

    this._lastBuildTs = Date.now();
    try {
      const texts = this.docs.map((d) => d.text);
      this.index = buildTfIdf(texts);
      this.built = true;
      this.buildError = null;
    } catch (err) {
      this.built = false;
      this.buildError = err.message;
      this.index = { vectors: [], idf: {}, docTokens: [] };
    }
  }

  isBuilt() {
    return this.built;
  }

  getBuildError() {
    return this.buildError;
  }

  getDocCount() {
    return this.docs.length;
  }

  /**
   * Hybrid retrieval: TF-IDF semantic similarity + keyword overlap,
   * disease-scoped where a disease context is provided, with source
   * de-duplication and diversity enforcement.
   *
   * @param {string} query
   * @param {Object} options
   *   { topK, disease, minRelevance, diversityLimit, includeCrossDisease }
   * @returns {Object} { status, query, results, totalScanned, retrievalMethod, message }
   */
  search(query, options = {}) {
    const startTs = Date.now();
    const topK = options.topK || DEFAULT_TOP_K;
    const disease = options.disease;
    const minRelevance = options.minRelevance !== undefined ? options.minRelevance : MIN_RELEVANCE;
    const diversityLimit = options.diversityLimit !== undefined ? options.diversityLimit : DEFAULT_DIVERSITY_LIMIT;
    const includeCrossDisease = options.includeCrossDisease !== false;

    if (!query || !query.trim()) {
      return {
        status: 'INSUFFICIENT_EVIDENCE',
        query: '',
        results: [],
        totalScanned: 0,
        retrievalMethod: 'TF-IDF + keyword hybrid',
        message: 'No query terms provided for evidence retrieval.',
      };
    }

    if (!this.built) {
      this.build();
    }

    const queryTokens = tokenize(query);
    if (queryTokens.length === 0) {
      return {
        status: 'INSUFFICIENT_EVIDENCE',
        query: query.trim(),
        results: [],
        totalScanned: this.docs.length,
        retrievalMethod: 'TF-IDF + keyword hybrid',
        message: 'No usable query tokens after normalization.',
      };
    }

    // Build query TF-IDF vector using the store's idf.
    const qtf = {};
    queryTokens.forEach((t) => { qtf[t] = (qtf[t] || 0) + 1; });
    const maxQtf = Math.max(...Object.values(qtf), 1);
    const qVec = {};
    Object.keys(qtf).forEach((t) => {
      qVec[t] = (qtf[t] / maxQtf) * ((this.index && this.index.idf[t]) || 0);
    });

    const candidateDocs = disease
      ? this.docs.filter((d) => d.disease === disease)
      : this.docs;

    const totalScanned = candidateDocs.length;

    if (candidateDocs.length === 0) {
      // No documents at all for the requested disease (or no disease specified
      // and the store is empty). Do not fall back to potentially irrelevant
      // cross-disease results when a specific disease was requested.
      return {
        status: 'INSUFFICIENT_EVIDENCE',
        query: queryTokens.join(' '),
        results: [],
        totalScanned,
        retrievalMethod: 'TF-IDF + keyword hybrid',
        message: disease
          ? `No knowledge-base documents found for disease '${disease}'.`
          : 'No knowledge-base documents are indexed.',
      };
    }

    return this._scoreAndRank(candidateDocs, qVec, queryTokens, topK, minRelevance, diversityLimit, totalScanned, false);
  }

  _scoreAndRank(docs, qVec, queryTokens, topK, minRelevance, diversityLimit, totalScanned, wasFallback) {
    const idf = (this.index && this.index.idf) || {};
    const docTokensMap = new Map();
    docs.forEach((d, i) => {
      docTokensMap.set(d.chunkId, tokenize(d.text));
    });

    const scored = docs.map((d) => {
      const dVec = {};
      const tokens = tokenize(d.text);
      const tf = {};
      tokens.forEach((t) => { tf[t] = (tf[t] || 0) + 1; });
      const maxTf = Math.max(...Object.values(tf), 1);
      Object.keys(tf).forEach((t) => { dVec[t] = (tf[t] / maxTf) * (idf[t] || 0); });

      const semantic = cosineSim(qVec, dVec);
      const keyword = keywordOverlap(queryTokens, docTokensMap.get(d.chunkId));
      // Hybrid weight: 70% semantic TF-IDF, 30% keyword overlap.
      const hybrid = 0.7 * semantic + 0.3 * keyword;

      return {
        chunkId: d.chunkId,
        text: d.text,
        disease: d.disease,
        sourceId: d.sourceId,
        title: d.title,
        organization: d.organization,
        url: d.url,
        publicationDate: d.publicationDate,
        documentType: d.documentType,
        topic: d.topic,
        chunkIndex: d.chunkIndex,
        semanticScore: Math.round(semantic * 1000) / 1000,
        keywordScore: Math.round(keyword * 1000) / 1000,
        relevanceScore: Math.round(hybrid * 1000) / 1000,
        metadata: d.metadata,
      };
    });

    // Filter by minimum relevance, sort descending.
    let ranked = scored.filter((s) => s.relevanceScore >= minRelevance);
    ranked.sort((a, b) => b.relevanceScore - a.relevanceScore);

    // Source diversity: cap chunks per source (hard limit) and fill up to topK.
    // Backfill also respects the per-source cap so no source dominates.
    const diverse = [];
    const sourceCount = {};
    ranked.forEach((s) => {
      const cnt = sourceCount[s.sourceId] || 0;
      if (cnt < diversityLimit && diverse.length < topK) {
        diverse.push(s);
        sourceCount[s.sourceId] = cnt + 1;
      }
    });

    // Backfill remaining slots only if per-source cap still allows it.
    if (diverse.length < topK) {
      const usedIds = new Set(diverse.map((s) => s.chunkId));
      ranked.forEach((s) => {
        if (diverse.length >= topK) return;
        if (usedIds.has(s.chunkId)) return;
        const cnt = sourceCount[s.sourceId] || 0;
        if (cnt < diversityLimit) {
          diverse.push(s);
          usedIds.add(s.chunkId);
          sourceCount[s.sourceId] = cnt + 1;
        }
      });
    }

    const results = diverse.slice(0, topK);

    return {
      status: results.length > 0 ? 'SUCCESS' : 'INSUFFICIENT_EVIDENCE',
      query: queryTokens.join(' '),
      results,
      totalScanned,
      retrievalMethod: 'TF-IDF + keyword hybrid',
      fallback: wasFallback,
      message: results.length > 0
        ? `Retrieved ${results.length} evidence source(s).`
        : `No evidence met the minimum relevance threshold (${minRelevance}).`,
      durationMs: Date.now() - (this._lastBuildTs || 0),
    };
  }

  /**
   * Get all unique diseases represented in the index.
   */
  getDiseases() {
    return [...new Set(this.docs.map((d) => d.disease))];
  }

  /**
   * Get source metadata summary per disease.
   */
  getSourceSummary() {
    const summary = {};
    SUPPORTED_DISEASES.forEach((d) => {
      const docs = this.docs.filter((x) => x.disease === d);
      const sources = {};
      docs.forEach((x) => {
        if (!sources[x.sourceId]) {
          sources[x.sourceId] = {
            sourceId: x.sourceId,
            title: x.title,
            organization: x.organization,
            publicationDate: x.publicationDate,
            url: x.url,
            documentType: x.documentType,
            topic: x.topic,
            chunkCount: 0,
          };
        }
        sources[x.sourceId].chunkCount++;
      });
      summary[d] = { documentCount: docs.length, sourceCount: Object.keys(sources).length, sources: Object.values(sources) };
    });
    return summary;
  }
}

// Singleton store (built lazily on first search).
const store = new VectorStore();

module.exports = {
  VectorStore,
  store,
  tokenize,
  buildTfIdf,
  cosineSim,
  keywordOverlap,
  DEFAULT_TOP_K,
  MIN_RELEVANCE,
};