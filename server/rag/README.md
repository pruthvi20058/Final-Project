# MediAgent Clinical RAG — Task 6 Documentation

## Overview

This directory documents the **Advanced Clinical RAG, Medical Knowledge Base and Evidence-Grounded Explanations** subsystem (Task 6) of the MediAgent clinical decision-support prototype.

The RAG subsystem retrieves relevant, trustworthy medical evidence and generates explanations grounded in the retrieved sources. It cleanly distinguishes:

- **Patient-reported symptoms** (from NLP extraction / patient verification)
- **Verified laboratory findings** (from OCR lab-report workflow)
- **ML model predictions** (from the disease classifier, e.g. Pima diabetes)
- **Retrieved medical evidence** (from the curated knowledge base)
- **AI-generated explanations** (from the grounded LLM service)

## Design principles

- **Do not rebuild or replace the existing architecture.** The existing pure-JS TF-IDF vector search (`server/knowledge/medicalKB.js`) is preserved and enhanced, not replaced. No FAISS or sentence-transformers dependency is introduced (neither is installed; native-module compilation is blocked in this environment).
- **No fabricated evidence or citations.** Every citation refers to an actual retrieved document from the curated knowledge base.
- **No hardcoded LLM API keys.** No external LLM provider is used; explanations are synthesized deterministically from retrieved evidence + ML + SHAP outputs.
- **No clinical validation claimed.** This is a research prototype; retrieved guidance is not proof of disease.
- **Patient-uploaded reports are never trusted as knowledge-base documents.** The ingestion pipeline is for curated, authoritative sources only.

## Supported diseases (Task 4 enabled set)

| Disease | Model readiness | Knowledge base |
|---------|----------------|----------------|
| Diabetes | VERIFIED (Pima tabular) | ✅ Ingested |
| Dengue | NEEDS_CLEANING (gated) | ✅ Ingested |
| Malaria | VERIFIED_LOW_PERFORMANCE | ✅ Ingested |
| Chikungunya | NEEDS_CLEANING (gated) | ✅ Ingested |
| Typhoid | UNAVAILABLE (gated) | ✅ Ingested (reliable sources only) |

Gated diseases (NEEDS_CLEANING / UNAVAILABLE) have knowledge-base sources for general context, but **no ML inference is served** for them per Task 4 gating.

## Knowledge base sources

All sources are drawn from recognized public-health and clinical-guideline organizations:

- World Health Organization (WHO)
- Centers for Disease Control and Prevention (CDC)
- National Health Service (NHS, UK)
- National Centre for Disease Control, India (NCDC)
- American Diabetes Association (ADA)
- National Institute of Diabetes and Digestive and Kidney Diseases (NIDDK)

No document, publication date, guideline recommendation, or source URL is invented. Content is general, widely-accepted public-health information consistent across the cited organizations. Each source preserves:

- Document title
- Source organization
- Original URL
- Publication date
- Retrieval date
- Disease category
- Document type
- Version / edition

## Ingestion pipeline (`server/services/ingestionService.js`)

- Supports text (.txt/.md) and PDF (.pdf) documents (PDF via `pdf-parse`, optional)
- Extracts readable text; detects empty or corrupted documents
- Removes duplicate documents by canonical fingerprint (title + organization + URL)
- Preserves page numbers, headings/sections, and source metadata per chunk
- Splits documents into sentence-boundary-respecting chunks (~900 chars, 150-char overlap)
- Attaches source metadata to every chunk
- Tracks document versions and ingestion status
- Does not silently ignore ingestion failures (explicit error status returned)

## Vector store & retrieval (`server/services/vectorStoreService.js`)

- Enhanced TF-IDF vector store over all chunked knowledge-base documents
- Hybrid scoring: 70% semantic TF-IDF + 30% keyword overlap
- Disease-aware retrieval (scoped to the requested disease knowledge base)
- Top-k retrieval with configurable minimum relevance threshold
- Similarity scores exposed (semantic, keyword, hybrid)
- Duplicate result removal + source diversity enforcement (max N chunks per source)
- Retrieval logging uses sanitized queries only (no patient data logged)
- Returns explicit `INSUFFICIENT_EVIDENCE` status when nothing matches (no fabricated evidence)

## Evidence quality & conflict handling (`server/services/ragService.js`)

- Outdated-source detection (> 3 years old)
- Missing-publication-date flagging
- Low-relevance flagging
- Conflicting/divergent guidance detection across organizations and dates
- Quality flags surfaced in the retrieval response and explanation

## Evidence-grounded explanations (`server/services/groundedLlmService.js`)

- Uses only supplied patient information + retrieved evidence for case-specific claims
- Distinguishes **retrieved facts** (evidenceFacts, tied to sources) from **AI-generated interpretation** (interpretation, clearly labelled)
- Explains why each evidence item is relevant
- Full citations: organization, title, section, page, URL, publication date
- Never invents medical recommendations, dosages, or numerical risk estimates
- Acknowledges missing/conflicting information; states when evidence is insufficient
- **ML probability and outcome are invariant** — never changed by RAG/LLM
- **SHAP values are invariant** — never changed by RAG/LLM

## API endpoints

All endpoints require JWT authentication (`authenticateToken`).

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/rag/retrieve` | POST | Disease-aware hybrid evidence retrieval |
| `/api/rag/sources` | GET | List all knowledge-base sources |
| `/api/rag/sources/:disease` | GET | Sources + documents for a disease |
| `/api/rag/stats` | GET | Knowledge base statistics |
| `/api/rag/diseases` | GET | Supported diseases |
| `/api/knowledge/*` | GET/POST | Existing conditions/search/interactions (preserved) |
| `/api/reports/:id/evidence` | GET | Per-report evidence retrieval (ownership enforced) |

### POST /api/rag/retrieve

Request body:
```json
{
  "query": "dengue fever warning signs",
  "disease": "dengue",
  "symptoms": ["fever", "headache"],
  "featuresPresent": [],
  "predictedOutcome": "",
  "queryKeywords": "",
  "topK": 5
}
```

Response includes `status` (`SUCCESS` or `INSUFFICIENT_EVIDENCE`), `sources` (rich citation metadata), `qualityFlags`, and `retrievalInfo`.

## Citation format

Every citation includes:
- Source organization
- Document title
- Section / topic
- Page number (where available)
- Original source URL
- Publication / retrieval date
- Relevance score

Citations refer to actual retrieved documents only.

## Testing

Run the Task 6 RAG test suites (no SQLite/server required):

```bash
node server/tests/test-rag-ingestion.js
node server/tests/test-rag-retrieval.js
node server/tests/test-rag-citations.js
```

Note: The pre-existing `server/tests/test-rag-diabetes.js` requires `better-sqlite3` (native module), which cannot be compiled in this sandbox environment — a pre-existing limitation unrelated to Task 6.

## Directory layout

```
server/rag/
  README.md            # This file
  RAG_EVALUATION.md    # Evaluation methodology, cases, results, limitations
server/knowledge/
  index.js             # Knowledge base registry/loader
  diabetes/sources.json
  diabetes/documents.json
  dengue/sources.json
  dengue/documents.json
  malaria/sources.json
  malaria/documents.json
  chikungunya/sources.json
  chikungunya/documents.json
  typhoid/sources.json
  typhoid/documents.json
server/services/
  ingestionService.js  # PDF + text ingestion pipeline
  vectorStoreService.js # Enhanced TF-IDF + hybrid retrieval
  ragService.js        # Evidence retrieval + quality/conflict checks
  groundedLlmService.js # Evidence-grounded explanations + citations
server/routes/
  rag.js               # RAG API endpoints
server/tests/
  test-rag-ingestion.js
  test-rag-retrieval.js
  test-rag-citations.js
```

## Limitations

- No external embedding model or FAISS; pure-JS TF-IDF is used (matches existing environment constraints).
- No external LLM provider; explanations are synthesized deterministically.
- Page-level mapping is not available from the text-extraction layer (page set to null; section preserved from topic).
- better-sqlite3 native module cannot compile in this sandbox, so DB-backed tests cannot run here (pre-existing limitation).
- Knowledge-base content is general public-health information, not patient-specific medical advice.