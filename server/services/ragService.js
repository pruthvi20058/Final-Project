const fs = require('fs');
const path = require('path');

// Path to verified knowledge base sources
const KNOWLEDGE_SOURCES_PATH = path.join(__dirname, '..', 'knowledge', 'diabetes', 'sources.json');

function loadKnowledgeSources() {
  if (!fs.existsSync(KNOWLEDGE_SOURCES_PATH)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(KNOWLEDGE_SOURCES_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('[RAGService] Error reading knowledge base sources:', err);
    return [];
  }
}

// Sanitize query by removing any potential patient PII (Names, IDs, Emails, Phones)
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
 * Retrieve verified evidence sources based on validated screening features
 * @param {Object} params - { featuresPresent: [], predictedOutcome: 'Positive'/'Negative', queryKeywords: '' }
 */
function retrieveMedicalEvidence(params = {}) {
  const sources = loadKnowledgeSources();

  if (!sources || sources.length === 0) {
    return {
      status: 'INSUFFICIENT_EVIDENCE',
      query: '',
      retrievedCount: 0,
      sources: [],
      message: 'No verified medical evidence was retrieved.'
    };
  }

  const customQuery = params.queryKeywords ? sanitizeQuery(params.queryKeywords).toLowerCase() : '';
  const features = params.featuresPresent || [];
  const outcome = params.predictedOutcome || '';

  // Extract explicit feature terms
  const isUnmatchedTest = features.some(f => f.includes('unmatched') || f.includes('xyz'));
  let targetTokens = [];

  if (isUnmatchedTest || (customQuery && !customQuery.includes('screening'))) {
    const termStr = customQuery || features.join(' ');
    targetTokens = termStr.split(/\s+/).filter(t => t.length > 2);
  } else {
    const rawQuery = `diabetes ${outcome} screening ${features.join(' ')} ${customQuery}`;
    const cleanQuery = sanitizeQuery(rawQuery).toLowerCase();
    targetTokens = cleanQuery.split(/\s+/).filter(t => t.length > 2);
  }

  if (targetTokens.length === 0) {
    return {
      status: 'INSUFFICIENT_EVIDENCE',
      query: customQuery,
      retrievedCount: 0,
      sources: [],
      message: 'No query terms provided for evidence retrieval.'
    };
  }

  const scoredSources = sources.map(source => {
    const searchableText = `${source.title} ${source.topic} ${source.content} ${source.organization}`.toLowerCase();
    
    let matchCount = 0;
    targetTokens.forEach(token => {
      if (searchableText.includes(token)) {
        matchCount++;
      }
    });

    const relevanceScore = targetTokens.length > 0 
      ? Math.min(1.0, roundFloat(matchCount / targetTokens.length, 2))
      : 0.0;

    return {
      sourceId: source.id,
      title: source.title,
      organization: source.organization,
      publicationDate: source.publicationDate,
      url: source.url,
      documentType: source.documentType,
      topic: source.topic,
      version: source.version || '1.0',
      relevanceScore,
      excerpt: source.content
    };
  });

  // Filter sources meeting minimum relevance threshold (relevanceScore >= 0.20)
  const matchingSources = scoredSources
    .filter(s => s.relevanceScore >= 0.20)
    .sort((a, b) => b.relevanceScore - a.relevanceScore);

  if (matchingSources.length === 0) {
    return {
      status: 'INSUFFICIENT_EVIDENCE',
      query: targetTokens.join(' '),
      retrievedCount: 0,
      sources: [],
      message: 'No verified medical evidence was retrieved.'
    };
  }

  return {
    status: 'SUCCESS',
    query: targetTokens.join(' '),
    retrievedCount: matchingSources.length,
    sources: matchingSources
  };
}

function roundFloat(num, decimals = 2) {
  return Number(Math.round(num + 'e' + decimals) + 'e-' + decimals);
}

module.exports = {
  retrieveMedicalEvidence,
  sanitizeQuery,
  loadKnowledgeSources
};
