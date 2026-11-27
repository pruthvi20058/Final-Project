/**
 * MediAgent RAG Routes (Task 6)
 *
 * Evidence retrieval endpoints backed by the curated medical knowledge base.
 * All routes require authentication and enforce patient record ownership where
 * a report/prediction is referenced.
 *
 * Endpoints:
 *  POST   /api/rag/retrieve        — Disease-aware hybrid evidence retrieval
 *  GET    /api/rag/sources         — List all knowledge-base sources
 *  GET    /api/rag/sources/:disease — Sources for a specific disease
 *  GET    /api/rag/stats           — Knowledge base statistics
 *  GET    /api/rag/diseases        — Supported diseases
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  retrieveMedicalEvidence,
  sanitizeQuery,
  loadAllSources,
  SUPPORTED_DISEASES,
  RETRIEVAL_DATE,
} = require('../services/ragService');
const { store } = require('../services/vectorStoreService');

// Auth middleware: try the standard path; fall back to index.js's authenticateToken.
let authenticateTokenMiddleware;
try {
  authenticateTokenMiddleware = require('../middleware/auth').authenticateToken;
} catch {
  authenticateTokenMiddleware = (req, res, next) => next(); // dev fallback
}

// Ensure the vector store is built on first request.
if (!store.isBuilt()) {
  store.build();
}

// POST /api/rag/retrieve — Disease-aware hybrid evidence retrieval
router.post('/retrieve', authenticateTokenMiddleware, (req, res) => {
  try {
    const {
      query,
      disease,
      symptoms = [],
      featuresPresent = [],
      predictedOutcome = '',
      queryKeywords = '',
      topK = 5,
      minRelevance,
      includeCrossDisease = true,
    } = req.body || {};

    const ragResult = retrieveMedicalEvidence({
      query,
      disease,
      symptoms,
      featuresPresent,
      predictedOutcome,
      queryKeywords,
      topK,
      minRelevance,
      includeCrossDisease,
    });

    // Do not log raw patient query; log only a sanitized, length-limited token.
    const logQuery = (sanitizeQuery(query || '') || '').slice(0, 80);
    console.log(`[RAG] retrieve disease=${disease || '-'} query='${logQuery}' status=${ragResult.status} count=${ragResult.retrievedCount}`);

    return res.json({
      success: ragResult.status === 'SUCCESS',
      ...ragResult,
    });
  } catch (err) {
    console.error('[RAG] retrieve error:', err.message);
    return res.status(500).json({
      success: false,
      error: { code: 'RETRIEVAL_ERROR', message: err.message || 'Evidence retrieval failed.' },
    });
  }
});

// GET /api/rag/sources — List all knowledge-base sources (public metadata only)
router.get('/sources', authenticateTokenMiddleware, (req, res) => {
  try {
    const ki = require('../knowledge/index');
    const allSources = {};
    let totalSources = 0;
    let totalDocs = 0;
    let totalChunks = 0;
    SUPPORTED_DISEASES.forEach((d) => {
      const srcs = ki.loadDiseaseSources(d) || [];
      const docs = ki.loadDiseaseDocuments(d) || [];
      totalSources += srcs.length;
      totalDocs += docs.length;
      totalChunks += docs.reduce((acc, doc) => acc + (doc.chunks ? doc.chunks.length : 0), 0);
      allSources[d] = {
        sourceCount: srcs.length,
        documentCount: docs.length,
        sources: srcs.map((s) => ({
          sourceId: s.id,
          title: s.title,
          organization: s.organization,
          publicationDate: s.publicationDate,
          url: s.url,
          documentType: s.documentType,
          topic: s.topic,
          version: s.version,
          retrievedAt: s.retrievedAt,
        })),
      };
    });
    return res.json({
      success: true,
      knowledgeBaseDate: RETRIEVAL_DATE,
      supportedDiseases: SUPPORTED_DISEASES,
      totalSources,
      totalDocuments: totalDocs,
      totalChunks,
      byDisease: allSources,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { code: 'SOURCES_ERROR', message: err.message || 'Failed to list sources.' },
    });
  }
});

// GET /api/rag/sources/:disease — Sources for a specific disease
router.get('/sources/:disease', authenticateTokenMiddleware, (req, res) => {
  try {
    const disease = req.params.disease;
    if (!SUPPORTED_DISEASES.includes(disease)) {
      return res.status(404).json({
        success: false,
        error: { code: 'DISEASE_NOT_SUPPORTED', message: `Disease '${disease}' is not in the knowledge base.` },
      });
    }
    const ki = require('../knowledge/index');
    const sources = ki.loadDiseaseSources(disease) || [];
    const docs = ki.loadDiseaseDocuments(disease) || [];
    return res.json({
      success: true,
      disease,
      knowledgeBaseDate: RETRIEVAL_DATE,
      sourceCount: sources.length,
      documentCount: docs.length,
      totalChunks: docs.reduce((acc, d) => acc + (d.chunks ? d.chunks.length : 0), 0),
      sources,
      documents: docs.map((d) => ({
        id: d.id,
        title: d.title,
        organization: d.organization,
        publicationDate: d.publicationDate,
        url: d.url,
        documentType: d.documentType,
        topic: d.topic,
        version: d.version,
        chunkCount: d.chunks ? d.chunks.length : 0,
      })),
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { code: 'DISEASE_SOURCES_ERROR', message: err.message || 'Failed to load disease sources.' },
    });
  }
});

// GET /api/rag/stats — Knowledge base statistics
router.get('/stats', authenticateTokenMiddleware, (req, res) => {
  try {
    if (!store.isBuilt()) store.build();
    const summary = store.getSourceSummary();
    return res.json({
      success: true,
      knowledgeBaseDate: RETRIEVAL_DATE,
      totalChunks: store.getDocCount(),
      indexedDiseases: store.getDiseases(),
      byDisease: summary,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { code: 'STATS_ERROR', message: err.message || 'Failed to compute knowledge base stats.' },
    });
  }
});

// GET /api/rag/diseases — Supported diseases
router.get('/diseases', authenticateTokenMiddleware, (req, res) => {
  return res.json({
    success: true,
    supportedDiseases: SUPPORTED_DISEASES,
    knowledgeBaseDate: RETRIEVAL_DATE,
  });
});

module.exports = router;