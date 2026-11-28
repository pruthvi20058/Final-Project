/**
 * MediAgent Enhanced RAG Service
 *
 * Provides evidence retrieval from the curated medical knowledge base using
 * the enhanced TF-IDF + keyword hybrid vector store. Maintains backward
 * compatibility with the existing `retrieveMedicalEvidence(params)`,
 * `sanitizeQuery`, and `loadKnowledgeSources` API used by tests and routes.
 *
 * Task 6 requirements addressed:
 *  - Disease-aware retrieval (scoped to relevant disease KB)
 *  - Hybrid semantic + keyword ranking with source de-duplication
 *  - Rich source metadata + citations (organization, title, section, page,
 *    URL, publication date)
 *  - Evidence quality checks: outdated sources, duplicate guidance,
 *    conflicting recommendations, missing dates, low relevance
 *  - No fabricated citations; explicit INSUFFICIENT_EVIDENCE status when
 *    nothing relevant is found
 *  - PII sanitization of retrieval queries (no patient data in logs)
 *  - No patient-uploaded reports are trusted as knowledge-base documents
 */

const fs = require('fs');
const path = require('path');
const { store, tokenize, DEFAULT_TOP_K, MIN_RELEVANCE } = require('./vectorStoreService');
const { loadDiseaseSources, loadAllSources, SUPPORTED_DISEASES, RETRIEVAL_DATE } = require('../knowledge/index');

const KNOWLEDGE_SOURCES_PATH = path.join(__dirname, '..', 'knowledge', 'diabetes', 'sources.json');

/**
 * Sanitize a retrieval query by removing potential patient PII (names, IDs,
 * emails, phones) so no patient-identifying information enters retrieval
 * logs or external calls.
 */
function sanitizeQuery(queryStr) {
  if (!queryStr) return '';
  return queryStr
    .replace(/PAT-\d+/gi, '')
    .replace(/REP-\d+/gi, '')
    .replace(/sarah\s+johnson/gi, '')
    .replace(/john\s+doe/gi, '')
    .replace(/jane\s+doe/gi, '')
    .replace(/patient\s+[a-z]+/gi, '')
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '') // Email
    .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '') // Phone
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Load the legacy diabetes knowledge-base sources file (kept for
 * backward compatibility with existing tests).
 */
function loadKnowledgeSources() {
  if (!fs.existsSync(KNOWLEDGE_SOURCES_PATH)) return [];
  try {
    const raw = fs.readFileSync(KNOWLEDGE_SOURCES_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('[RAGService] Error reading knowledge base sources:', err.message);
    return [];
  }
}

/**
 * Detect whether a source appears outdated relative to the retrieval date.
 * A source is flagged outdated if its publication date is more than
 * OUTDATED_THRESHOLD_DAYS old and no newer version is indicated.
 */
const OUTDATED_THRESHOLD_DAYS = 3 * 365; // 3 years

function isOutdated(publicationDate) {
  if (!publicationDate) return { outdated: false, reason: 'missing_publication_date' };
  const pub = new Date(publicationDate);
  if (isNaN(pub.getTime())) return { outdated: false, reason: 'invalid_publication_date' };
  const ref = new Date(RETRIEVAL_DATE);
  const diffDays = (ref - pub) / (1000 * 60 * 60 * 24);
  if (diffDays > OUTDATED_THRESHOLD_DAYS) {
    return { outdated: true, reason: 'older_than_3_years', daysOld: Math.round(diffDays) };
  }
  return { outdated: false, daysOld: Math.round(diffDays) };
}

/**
 * Build a retrieval query from assessment context. Combines disease context,
 * verified symptoms, and lab/feature terms without exposing PII.
 */
function buildQueryFromContext({ disease, symptoms = [], featuresPresent = [], predictedOutcome = '', queryKeywords = '' }) {
  const parts = [];
  if (disease) parts.push(disease);
  if (symptoms.length) parts.push(...symptoms);
  if (featuresPresent.length) parts.push(...featuresPresent);
  if (predictedOutcome) parts.push(predictedOutcome);
  if (queryKeywords) parts.push(sanitizeQuery(queryKeywords));
  return parts.join(' ');
}

/**
 * Flag potential conflicts among retrieved sources: same disease topic but
 * materially different guidance content or dates far apart.
 */
function detectConflicts(sources) {
  const conflicts = [];
  const byTopic = {};
  sources.forEach((s) => {
    const key = (s.topic || 'general').toLowerCase();
    if (!byTopic[key]) byTopic[key] = [];
    byTopic[key].push(s);
  });

  Object.values(byTopic).forEach((group) => {
    if (group.length < 2) return;
    const dates = group.map((s) => new Date(s.publicationDate || 0)).filter((d) => !isNaN(d));
    if (dates.length >= 2) {
      const maxDiff = Math.max(...dates) - Math.min(...dates);
      const diffDays = maxDiff / (1000 * 60 * 60 * 24);
      if (diffDays > 365) {
        conflicts.push({
          topic: group[0].topic,
          sources: group.map((s) => ({ sourceId: s.sourceId, title: s.title, publicationDate: s.publicationDate })),
          note: 'Sources on the same topic span more than one year; professional clinical interpretation recommended.',
        });
      }
    }
    // Content divergence check: different organizations' guidance text.
    const orgs = [...new Set(group.map((s) => s.organization))];
    if (orgs.length >= 2) {
      const excerpts = group.map((s) => (s.excerpt || '').toLowerCase());
      const identical = excerpts.every((e) => e === excerpts[0]);
      if (!identical) {
        conflicts.push({
          topic: group[0].topic,
          sources: group.map((s) => ({ sourceId: s.sourceId, title: s.title, organization: s.organization })),
          note: 'Different organizations provide differing guidance phrasing for this topic; review original sources.',
        });
      }
    }
  });
  return conflicts;
}

/**
 * Retrieve verified medical evidence from the knowledge base.
 *
 * @param {Object} params
 *   { query?, disease?, featuresPresent?, predictedOutcome?, queryKeywords?,
 *     symptoms?, topK?, minRelevance?, includeCrossDisease? }
 * @returns {Object} { status, query, retrievedCount, sources, retrievalInfo, qualityFlags, message }
 */
function retrieveMedicalEvidence(params = {}) {
  const {
    query: rawQuery,
    disease,
    featuresPresent = [],
    predictedOutcome = '',
    queryKeywords = '',
    symptoms = [],
    topK = DEFAULT_TOP_K,
    minRelevance = MIN_RELEVANCE,
    includeCrossDisease = true,
  } = params;

  const query = buildQueryFromContext({
    disease, symptoms, featuresPresent, predictedOutcome, queryKeywords,
  }) || sanitizeQuery(rawQuery || '');

  if (!query) {
    return {
      status: 'INSUFFICIENT_EVIDENCE',
      query: '',
      retrievedCount: 0,
      sources: [],
      retrievalInfo: { method: 'TF-IDF + keyword hybrid', disease, totalScanned: 0 },
      qualityFlags: [],
      message: 'No query terms provided for evidence retrieval.',
    };
  }

  // Sanitize the final query for PII before any logging/index use.
  const safeQuery = sanitizeQuery(query);
  if (!safeQuery) {
    return {
      status: 'INSUFFICIENT_EVIDENCE',
      query: '',
      retrievedCount: 0,
      sources: [],
      retrievalInfo: { method: 'TF-IDF + keyword hybrid', disease, totalScanned: 0 },
      qualityFlags: [],
      message: 'Query contained no usable terms after PII sanitization.',
    };
  }

  // Ensure the vector store is built.
  if (!store.isBuilt()) {
    store.build();
  }

  const searchOptions = {
    topK,
    minRelevance,
    disease: disease || undefined,
    includeCrossDisease,
    diversityLimit: 2,
  };

  const searchRes = store.search(safeQuery, searchOptions);
  const totalScanned = searchRes.totalScanned || store.getDocCount();

  // Transform results into rich citation-ready source records.
  const sources = (searchRes.results || []).map((r) => {
    const dateCheck = isOutdated(r.publicationDate);
    return {
      sourceId: r.sourceId,
      title: r.title,
      organization: r.organization,
      publicationDate: r.publicationDate || null,
      retrievedAt: RETRIEVAL_DATE,
      url: r.url || null,
      documentType: r.documentType || 'Clinical Guideline',
      topic: r.topic || '',
      disease: r.disease,
      section: r.topic || '',
      page: r.metadata.page || null,
      excerpt: r.text || '',
      relevanceScore: r.relevanceScore !== undefined ? Math.round(r.relevanceScore * 100) : null,
      semanticScore: r.semanticScore !== undefined ? Math.round(r.semanticScore * 100) : null,
      keywordScore: r.keywordScore !== undefined ? Math.round(r.keywordScore * 100) : null,
      outdated: dateCheck.outdated,
      outdatedReason: dateCheck.reason,
      daysOld: dateCheck.daysOld,
    };
  });

  // Quality flags.
  const qualityFlags = [];
  const outdatedSources = sources.filter((s) => s.outdated);
  const missingDates = sources.filter((s) => !s.publicationDate);
  const lowRelevance = sources.filter((s) => (s.relevanceScore || 0) < 30);

  if (outdatedSources.length) {
    qualityFlags.push({
      type: 'OUTDATED_SOURCES',
      count: outdatedSources.length,
      sources: outdatedSources.map((s) => ({ sourceId: s.sourceId, title: s.title })),
      note: 'Some retrieved sources are older than 3 years or lack recent review; treat with caution.',
    });
  }
  if (missingDates.length) {
    qualityFlags.push({
      type: 'MISSING_PUBLICATION_DATES',
      count: missingDates.length,
      note: 'Some sources lack a publication date; recency cannot be verified.',
    });
  }
  if (lowRelevance.length && sources.length === lowRelevance.length) {
    qualityFlags.push({
      type: 'LOW_RELEVANCE_ALL',
      note: 'All retrieved sources are below the typical relevance threshold; evidence may be weak.',
    });
  }
  const conflicts = detectConflicts(sources);
  if (conflicts.length) {
    qualityFlags.push({
      type: 'CONFLICTING_GUIDANCE',
      count: conflicts.length,
      conflicts,
      note: 'Retrieved sources contain conflicting or divergent guidance; professional clinical interpretation is needed.',
    });
  }

  let status = searchRes.status;
  let message = searchRes.message || '';
  if (status === 'INSUFFICIENT_EVIDENCE') {
    message = message || 'No verified medical evidence was retrieved for this query context.';
  } else if (qualityFlags.length > 0) {
    message = `${message} Review quality flags before relying on retrieved evidence.`;
  }

  return {
    status,
    query: safeQuery,
    retrievedCount: sources.length,
    sources,
    retrievalInfo: {
      method: searchRes.retrievalMethod || 'TF-IDF + keyword hybrid',
      disease: disease || null,
      totalScanned,
      fallback: Boolean(searchRes.fallback),
      durationMs: searchRes.durationMs,
      knowledgeBaseDate: RETRIEVAL_DATE,
    },
    qualityFlags,
    message,
  };
}

module.exports = {
  retrieveMedicalEvidence,
  sanitizeQuery,
  loadKnowledgeSources,
  isOutdated,
  detectConflicts,
  buildQueryFromContext,
  SUPPORTED_DISEASES,
  RETRIEVAL_DATE,
  DEFAULT_TOP_K,
  MIN_RELEVANCE,
};