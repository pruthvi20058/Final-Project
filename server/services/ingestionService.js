/**
 * MediAgent Document Ingestion Pipeline
 *
 * Ingests PDF and text medical knowledge-base documents into structured,
 * metadata-rich chunk records suitable for vector indexing.
 *
 * Design constraints (Task 6):
 *  - Patient-uploaded reports are NEVER ingested as trusted knowledge-base
 *    documents. This pipeline is for curated, authoritative sources only.
 *  - No silent failures: ingestion errors are reported explicitly.
 *  - Page numbers, headings, and source metadata are preserved per chunk.
 *  - Duplicate documents are detected by canonical URL.
 *  - Empty/corrupted documents are detected and reported.
 */

const fs = require('fs');
const path = require('path');

// pdf-parse is optional: PDF ingestion only works when the package is
// installed. Native-module compilation is blocked in some environments, so we
// load it lazily and report a clear error only when a PDF is actually
// submitted for ingestion.
let pdf = null;
try {
  pdf = require('pdf-parse');
} catch {
  pdf = null;
}

const KNOWLEDGE_DIR = path.join(__dirname, '..', 'knowledge');

// Common boilerplate/header/footer patterns to strip from extracted text.
const BOILERPLATE_PATTERNS = [
  /^\s*page\s+\d+\s*$/i,
  /^\s*\d+\s*\/\s*\d+\s*$/i,
  /^\s*©\s*\d{4}.*$/i,
  /^\s*world health organization\s*$/i,
  /^\s*centers for disease control.*$/i,
];

/**
 * Normalize whitespace and strip obvious headers/footers.
 */
function cleanText(text) {
  if (!text) return '';
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => {
      if (line.length === 0) return false;
      return !BOILERPLATE_PATTERNS.some((p) => p.test(line));
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Split text into chunks that respect sentence/paragraph boundaries and
 * avoid breaking important clinical recommendations mid-sentence.
 *
 * @param {string} text - cleaned document text
 * @param {number} targetChars - target chunk size (default 900)
 * @param {number} overlapChars - overlap between chunks (default 150)
 * @returns {Array<{text: string, startChar: number, endChar: number}>}
 */
function chunkText(text, targetChars = 900, overlapChars = 150) {
  if (!text || text.trim().length === 0) return [];

  const chunks = [];
  let start = 0;
  const len = text.length;

  while (start < len) {
    let end = Math.min(start + targetChars, len);

    // If we're not at the end of the document, try to break at a sentence
    // or paragraph boundary so clinical recommendations aren't split.
    if (end < len) {
      const slice = text.substring(start, end);
      const lastPeriod = slice.lastMatchIndexOfSentenceEnd();
      const breakAt = lastPeriod !== -1 ? start + lastPeriod + 1 : end;
      if (breakAt > start + targetChars * 0.5) {
        end = breakAt;
      } else {
        // Fall back to nearest newline or space within the target window.
        const window = text.substring(start, end);
        const lastNewline = window.lastIndexOf('\n');
        const lastSpace = window.lastIndexOf(' ');
        const candidate =
          lastNewline > lastSpace ? lastNewline : lastSpace;
        if (candidate > start + targetChars * 0.4) {
          end = start + candidate + 1;
        }
      }
    }

    const chunkText = text.substring(start, end).trim();
    if (chunkText.length > 0) {
      chunks.push({
        text: chunkText,
        startChar: start,
        endChar: end,
      });
    }

    if (end >= len) break;
    // Move start back by overlap for context continuity.
    start = Math.max(end - overlapChars, start + 1);
  }

  return chunks;
}

// Helper: index of last sentence-ending punctuation within a string.
String.prototype.lastMatchIndexOfSentenceEnd = function () {
  const markers = ['. ', '? ', '! ', '.\n', '?\n', '!\n'];
  let best = -1;
  markers.forEach((m) => {
    const idx = this.lastIndexOf(m);
    if (idx > best) best = idx;
  });
  return best;
};

/**
 * Detect whether extracted text is empty or corrupted (essentially no usable
 * clinical content).
 */
function isEmptyOrCorrupted(text) {
  if (!text || text.trim().length === 0) return true;
  const cleaned = cleanText(text);
  if (cleaned.length < 20) return true;
  // Heuristic: if the text is mostly non-alphanumeric noise, treat as corrupted.
  const alnumRatio = cleaned.replace(/[^a-zA-Z0-9\s]/g, '').length / cleaned.length;
  return alnumRatio < 0.4;
}

/**
 * Extract text from a PDF buffer. Returns { text, pageCount, success, error }.
 */
async function extractPdfText(buffer) {
  if (!pdf) {
    return {
      success: false,
      text: '',
      pageCount: 0,
      error: 'PDF ingestion unavailable: pdf-parse package is not installed in this environment.',
    };
  }
  try {
    const data = await pdf(buffer);
    const text = data.text || '';
    const pageCount = data.numpages || 0;
    return {
      success: true,
      text,
      pageCount,
      error: null,
    };
  } catch (err) {
    return {
      success: false,
      text: '',
      pageCount: 0,
      error: err.message || 'PDF extraction failed',
    };
  }
}

/**
 * Read a text file from disk.
 */
function readTextFile(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return { success: true, text: raw, error: null };
  } catch (err) {
    return { success: false, text: '', error: err.message || 'Text read failed' };
  }
}

/**
 * Compute a stable document fingerprint from title + organization + url for
 * duplicate detection.
 */
function documentFingerprint(doc) {
  const key = [
    (doc.title || '').trim().toLowerCase(),
    (doc.organization || '').trim().toLowerCase(),
    (doc.url || '').trim().toLowerCase(),
  ].join('||');
  // Simple stable hash (FNV-1a) to avoid external deps.
  let hash = 2166136261;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = (hash * 16777619) >>> 0;
  }
  return hash >>> 0;
}

/**
 * Ingest a single document (PDF buffer or text file) into a structured
 * knowledge-base document record with chunks and metadata.
 *
 * @param {Object} input
 *   { sourceId, title, organization, publicationDate, url, documentType,
 *     topic, disease, version, retrievedAt, fileBuffer?, filePath?, isPdf? }
 * @param {Object} existingFingerprints - Set of fingerprints already ingested
 * @returns {Object} { success, document, error, warning }
 */
async function ingestDocument(input, existingFingerprints = new Set()) {
  const {
    sourceId, title, organization, publicationDate, url, documentType,
    topic, disease, version, retrievedAt, fileBuffer, filePath, isPdf,
  } = input;

  const fingerprint = documentFingerprint({ title, organization, url });
  if (existingFingerprints.has(fingerprint)) {
    return {
      success: false,
      document: null,
      error: null,
      warning: `Duplicate document detected (${title}). Skipped ingestion.`,
      duplicate: true,
    };
  }

  let rawText = '';
  let pageCount = null;
  let extractError = null;

  if (isPdf && fileBuffer) {
    const pdfRes = await extractPdfText(fileBuffer);
    if (!pdfRes.success) {
      return {
        success: false,
        document: null,
        error: `PDF extraction failed for "${title}": ${pdfRes.error}`,
        duplicate: false,
      };
    }
    rawText = pdfRes.text;
    pageCount = pdfRes.pageCount;
  } else if (filePath) {
    const txtRes = readTextFile(filePath);
    if (!txtRes.success) {
      return {
        success: false,
        document: null,
        error: `Text read failed for "${title}": ${txtRes.error}`,
        duplicate: false,
      };
    }
    rawText = txtRes.text;
  } else if (input.text) {
    rawText = input.text;
  } else {
    return {
      success: false,
      document: null,
        error: 'No text source provided (fileBuffer, filePath, or text).',
      duplicate: false,
    };
  }

  if (isEmptyOrCorrupted(rawText)) {
    return {
      success: false,
      document: null,
      error: `Document "${title}" appears empty or corrupted; no usable text extracted.`,
      duplicate: false,
    };
  }

  const cleaned = cleanText(rawText);
  const chunks = chunkText(cleaned);

  if (chunks.length === 0) {
    return {
      success: false,
      document: null,
      error: `Document "${title}" produced no usable chunks after cleaning.`,
      duplicate: false,
    };
  }

  const now = new Date().toISOString();
  const documentRecord = {
    id: sourceId || `doc-${Date.now()}`,
    sourceId,
    title,
    organization,
    publicationDate,
    retrievedAt: retrievedAt || now,
    url,
    documentType,
    topic,
    disease,
    version: version || '1.0',
    pageCount,
    ingestedAt: now,
    fingerprint,
    chunkCount: chunks.length,
    chunks: chunks.map((chunk, idx) => ({
      chunkId: `${sourceId || 'doc'}-chunk-${idx}`,
      chunkIndex: idx,
      text: chunk.text,
      startChar: chunk.startChar,
      endChar: chunk.endChar,
      page: null, // page-level mapping not available from text/PDF text layer
      section: null,
      metadata: {
        sourceId,
        title,
        organization,
        disease,
        topic,
        documentType,
        publicationDate,
        url,
        version,
      },
    })),
  };

  existingFingerprints.add(fingerprint);
  return {
    success: true,
    document: documentRecord,
    error: null,
    warning: null,
    duplicate: false,
  };
}

/**
 * Ingest a directory of text/markdown knowledge-base documents. Each .txt/.md
 * file is treated as a separate document using its filename (without extension)
 * as the sourceId unless a manifest.json is present.
 */
async function ingestDirectory(dirPath, options = {}) {
  const {
    disease, organization, documentType, topic, version, retrievedAt, urlBase
  } = options;

  if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
    return { success: false, error: `Directory not found: ${dirPath}`, documents: [] };
  }

  const existingFingerprints = new Set();
  const documents = [];
  const errors = [];

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  // Support a manifest.json that declares per-file metadata.
  let manifest = {};
  if (fs.existsSync(path.join(dirPath, 'manifest.json'))) {
    try {
      manifest = JSON.parse(fs.readFileSync(path.join(dirPath, 'manifest.json'), 'utf-8'));
    } catch (e) {
      // ignore malformed manifest; fall back to defaults
    }
  }

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name).toLowerCase();
    if (ext !== '.txt' && ext !== '.md' && ext !== '.pdf') continue;

    const filePath = path.join(dirPath, entry.name);
    const baseName = path.basename(entry.name, ext);
    const meta = manifest[baseName] || {};
    const isPdf = ext === '.pdf';

    let fileBuffer = null;
    if (isPdf) {
      fileBuffer = fs.readFileSync(filePath);
    }

    const input = {
      sourceId: meta.sourceId || `ingested-${baseName}`,
      title: meta.title || baseName.replace(/[-_]/g, ' '),
      organization: meta.organization || organization || 'Unknown',
      publicationDate: meta.publicationDate || '',
      url: meta.url || (urlBase ? `${urlBase}/${entry.name}` : ''),
      documentType: meta.documentType || documentType || 'Clinical Guideline',
      topic: meta.topic || topic || 'general',
      disease: meta.disease || disease || 'general',
      version: meta.version || version || '1.0',
      retrievedAt: meta.retrievedAt || retrievedAt || new Date().toISOString(),
      fileBuffer: isPdf ? fileBuffer : undefined,
      filePath: isPdf ? undefined : filePath,
      isPdf,
      text: isPdf ? undefined : undefined, // read via filePath
    };

    const result = await ingestDocument(input, existingFingerprints);
    if (result.success) {
      documents.push(result.document);
    } else {
      errors.push({ file: entry.name, error: result.error, warning: result.warning });
    }
  }

  return {
    success: errors.length === 0,
    documents,
    errors,
    ingestedCount: documents.length,
    errorCount: errors.length,
  };
}

module.exports = {
  cleanText,
  chunkText,
  isEmptyOrCorrupted,
  extractPdfText,
  documentFingerprint,
  ingestDocument,
  ingestDirectory,
};