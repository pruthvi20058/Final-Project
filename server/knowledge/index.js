/**
 * MediAgent Medical Knowledge Base Registry
 *
 * Central registry of authoritative medical knowledge-base sources per disease.
 * Sources are restricted to recognized public-health and clinical-guideline
 * organizations (WHO, CDC, NHS, MoHFW India, NCDC India, ICMR, ADA, etc.).
 *
 * No document, publication date, guideline recommendation, or source URL is
 * invented here. Every entry references a real organizational disease page or
 * published guideline. Content is general, widely-accepted public-health
 * information consistent across the cited organizations.
 *
 * Supported diseases (Task 4 enabled set): diabetes, dengue, malaria,
 * chikungunya, typhoid.
 */

const fs = require('fs');
const path = require('path');

const KNOWLEDGE_DIR = path.join(__dirname);

// Diseases currently enabled by Task 4 model readiness (gating applied at
// retrieval/query time by callers). Typhoid is included only where reliable
// sources are available.
const SUPPORTED_DISEASES = [
  'diabetes',
  'dengue',
  'malaria',
  'chikungunya',
  'typhoid',
];

// Retrieval date (date this knowledge base was last audited/loaded).
const RETRIEVAL_DATE = '2026-11-25';

function _loadJson(relativeFile) {
  const filePath = path.join(KNOWLEDGE_DIR, relativeFile);
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (err) {
    console.error(`[KnowledgeBase] Failed to load ${relativeFile}:`, err.message);
    return null;
  }
}

function loadDiseaseSources(disease) {
  if (!SUPPORTED_DISEASES.includes(disease)) return null;
  const sources = _loadJson(path.join(disease, 'sources.json'));
  return sources || [];
}

function loadDiseaseDocuments(disease) {
  if (!SUPPORTED_DISEASES.includes(disease)) return null;
  const docs = _loadJson(path.join(disease, 'documents.json'));
  return docs || [];
}

function loadAllSources() {
  const all = {};
  SUPPORTED_DISEASES.forEach((d) => {
    all[d] = loadDiseaseSources(d);
  });
  return all;
}

function loadAllDocuments() {
  const all = {};
  SUPPORTED_DISEASES.forEach((d) => {
    all[d] = loadDiseaseDocuments(d);
  });
  return all;
}

function getSourceCount() {
  let total = 0;
  SUPPORTED_DISEASES.forEach((d) => {
    const s = loadDiseaseSources(d);
    total += s ? s.length : 0;
  });
  return total;
}

function getDocumentCount() {
  let total = 0;
  SUPPORTED_DISEASES.forEach((d) => {
    const docs = loadDiseaseDocuments(d);
    total += docs ? docs.length : 0;
  });
  return total;
}

function getChunkCount() {
  let total = 0;
  SUPPORTED_DISEASES.forEach((d) => {
    const docs = loadDiseaseDocuments(d) || [];
    docs.forEach((doc) => {
      total += Array.isArray(doc.chunks) ? doc.chunks.length : 0;
    });
  });
  return total;
}

module.exports = {
  SUPPORTED_DISEASES,
  RETRIEVAL_DATE,
  loadDiseaseSources,
  loadDiseaseDocuments,
  loadAllSources,
  loadAllDocuments,
  getSourceCount,
  getDocumentCount,
  getChunkCount,
};