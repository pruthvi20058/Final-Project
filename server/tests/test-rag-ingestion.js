/**
 * MediAgent Task 6 — RAG Ingestion Pipeline Tests
 *
 * Tests the document ingestion pipeline (ingestionService.js):
 *   1. Text document ingestion
 *   2. Metadata preservation (title, org, date, url, disease, topic, type)
 *   3. Chunking respects sentence boundaries
 *   4. Empty document detection
 *   5. Corrupted document detection
 *   6. Duplicate detection by canonical fingerprint
 *   7. Page/section metadata attachment
 *
 * These tests do not require the SQLite database or a running server.
 */

const assert = require('assert');
const path = require('path');
const {
  ingestDocument,
  ingestDirectory,
  cleanText,
  chunkText,
  isEmptyOrCorrupted,
  documentFingerprint,
} = require('../services/ingestionService');

let passed = 0;
let total = 0;

function record(title, condition, detail = '') {
  total++;
  if (condition) {
    passed++;
    console.log(`  ✅ TEST ${total}: ${title} — PASSED`);
    if (detail) console.log(`     ↳ ${detail}`);
  } else {
    console.error(`  ❌ TEST ${total}: ${title} — FAILED`);
    if (detail) console.error(`     ↳ ${detail}`);
  }
}

(async () => {
  console.log('==============================================================================');
  console.log('🧪 MediAgent Task 6 — RAG Ingestion Pipeline Tests');
  console.log('==============================================================================\n');

  const baseDoc = {
    sourceId: 'test-src-001',
    title: 'Test Clinical Guideline',
    organization: 'World Health Organization',
    publicationDate: '2026-01-15',
    url: 'https://www.who.int/test-guideline',
    documentType: 'Clinical Practice Guideline',
    topic: 'test_topic',
    disease: 'diabetes',
    version: '1.0',
    retrievedAt: '2026-11-25',
    text: 'This is a test clinical guideline about diabetes screening. It contains several sentences. '
      + 'Fasting plasma glucose >= 126 mg/dL indicates diabetes. HbA1c >= 6.5% also indicates diabetes. '
      + 'Repeat testing is required to confirm the diagnosis. Early screening reduces complications.',
  };

  // TEST 1: Text document ingestion produces structured document with chunks
  const res1 = await ingestDocument(baseDoc);
  record(
    'Text document ingestion produces a structured document record with chunks',
    res1.success === true && res1.document !== null && res1.document.chunkCount > 0,
    `Chunks: ${res1.document ? res1.document.chunkCount : 0}`
  );

  // TEST 2: Metadata is preserved on the document and every chunk
  if (res1.success) {
    const doc = res1.document;
    const metaOk = doc.title === 'Test Clinical Guideline'
      && doc.organization === 'World Health Organization'
      && doc.publicationDate === '2026-01-15'
      && doc.url === 'https://www.who.int/test-guideline'
      && doc.disease === 'diabetes'
      && doc.topic === 'test_topic'
      && doc.documentType === 'Clinical Practice Guideline';
    const chunksHaveMeta = doc.chunks.every((c) =>
      c.metadata.sourceId === 'test-src-001'
      && c.metadata.organization === 'World Health Organization'
      && c.metadata.disease === 'diabetes'
    );
    record(
      'Metadata preserved on document and all chunks (title, org, date, url, disease, topic, type)',
      metaOk && chunksHaveMeta,
      `Document fields OK: ${metaOk}; Chunks metadata OK: ${chunksHaveMeta}`
    );
    record(
      'Chunk text is non-empty and page/section fields present',
      doc.chunks.every((c) => c.text && c.text.length > 0)
      && doc.chunks.every((c) => 'page' in c && 'section' in c),
      `Chunk count: ${doc.chunks.length}`
    );
  } else {
    record('Metadata preserved on document and all chunks', false, `Ingestion failed: ${res1.error}`);
    record('Chunk text is non-empty and page/section fields present', false, `Ingestion failed: ${res1.error}`);
  }

  // TEST 3: Chunking does not break sentences mid-way (chunks end near sentence boundaries)
  if (res1.success) {
    const chunks = res1.document.chunks;
    const endsWithBoundary = chunks.every((c) => {
      const t = c.text.trim();
      return t.endsWith('.') || t.endsWith('?') || t.endsWith('!');
    });
    record(
      'Chunking respects sentence boundaries (chunks end with sentence punctuation)',
      endsWithBoundary || chunks.length === 1,
      `Chunks ending with boundary: ${chunks.filter((c) => /[.!?]$/.test(c.text.trim())).length}/${chunks.length}`
    );
  } else {
    record('Chunking respects sentence boundaries', false, `Ingestion failed: ${res1.error}`);
  }

  // TEST 4: Empty document (whitespace-only text) is detected and rejected
  const res4 = await ingestDocument({ ...baseDoc, text: '   \n\n   ' });
  record(
    'Empty/whitespace-only document is detected and rejected',
    res4.success === false && res4.error && res4.error.includes('empty'),
    `Error: ${res4.error}`
  );

  // TEST 4b: Truly missing text source is also rejected (no silent acceptance)
  const res4b = await ingestDocument({ ...baseDoc, text: undefined });
  record(
    'Missing text source is rejected rather than silently ingested',
    res4b.success === false,
    `Error: ${res4b.error}`
  );

  // TEST 5: Corrupted document (mostly non-alphanumeric noise) is detected
  const res5 = await ingestDocument({ ...baseDoc, text: '!!! @@@ ### $$$ %%% ^^^ &&& ***' });
  record(
    'Corrupted/noise document is detected and rejected',
    res5.success === false && res5.error && res5.error.includes('corrupted'),
    `Error: ${res5.error}`
  );

  // TEST 6: Duplicate detection by canonical fingerprint (title + org + url)
  const res6a = await ingestDocument(baseDoc);
  const res6b = await ingestDocument(baseDoc, new Set([documentFingerprint(baseDoc)]));
  record(
    'Duplicate document detected by fingerprint (title + organization + url)',
    res6b.success === false && res6b.duplicate === true,
    `Duplicate flagged: ${res6b.duplicate}; Warning: ${res6b.warning}`
  );

  // TEST 7: cleanText strips boilerplate lines (page numbers, copyright)
  const cleaned = cleanText('  Hello   World.  \n\n\n  Page 1  \n© 2026 WHO  ');
  record(
    'cleanText removes page-number and copyright boilerplate lines',
    !cleaned.includes('Page 1') && !cleaned.includes('© 2026') && cleaned.includes('Hello'),
    `Cleaned: "${cleaned}"`
  );

  // TEST 8: documentFingerprint is stable and collision-resistant
  const fp1 = documentFingerprint({ title: 'A', organization: 'B', url: 'C' });
  const fp2 = documentFingerprint({ title: 'A', organization: 'B', url: 'C' });
  const fp3 = documentFingerprint({ title: 'A', organization: 'B', url: 'D' });
  record(
    'documentFingerprint is stable for identical input and differs for different URL',
    fp1 === fp2 && fp1 !== fp3,
    `fp1=${fp1} fp2=${fp2} fp3=${fp3}`
  );

  // TEST 9: ingestDirectory on a non-existent directory returns an error
  const res9 = await ingestDirectory('/nonexistent/path/that/does/not/exist');
  record(
    'ingestDirectory on missing directory returns structured error',
    res9.success === false && res9.error && Array.isArray(res9.documents),
    `Error: ${res9.error}`
  );

  console.log('\n==============================================================================');
  console.log(`📊 INGESTION TEST RESULTS: ${passed} / ${total} PASSED`);
  console.log('==============================================================================\n');

  process.exit(passed === total ? 0 : 1);
})().catch((err) => {
  console.error('Test runner exception:', err);
  process.exit(1);
});