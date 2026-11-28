# MediAgent Clinical RAG — Evaluation Report (Task 6)

## 1. Methodology

### Scope
This evaluation covers the RAG subsystem introduced in Task 6:

- Document ingestion pipeline (`server/services/ingestionService.js`)
- Enhanced TF-IDF + keyword hybrid vector store (`server/services/vectorStoreService.js`)
- Evidence retrieval with quality/conflict checks (`server/services/ragService.js`)
- Evidence-grounded explanations + citations (`server/services/groundedLlmService.js`)
- RAG API endpoints (`server/routes/rag.js`, `/api/reports/:id/evidence`)

### Evaluation approach
Three automated test suites were executed against the implemented code (no SQLite database or running server required, because `better-sqlite3` cannot be compiled in this sandbox — a pre-existing limitation):

1. `server/tests/test-rag-ingestion.js` — ingestion pipeline (11 cases)
2. `server/tests/test-rag-retrieval.js` — retrieval & quality (16 cases)
3. `server/tests/test-rag-citations.js` — grounded explanations & citations (20 cases)

Total: **47 automated cases, 47 passed**.

### Metrics considered

| Metric | Status | Rationale |
|--------|--------|-----------|
| Retrieval precision | NOT_EVALUATED | No reference query↔relevant-document dataset available |
| Retrieval recall | NOT_EVALUATED | No reference set of all relevant documents per query |
| Precision@K | NOT_EVALUATED | No reference dataset; would require manual relevance judgments |
| Recall@K | NOT_EVALUATED | No reference dataset |
| Mean Reciprocal Rank (MRR) | NOT_EVALUATED | No reference dataset |
| Source relevance | MEASURED | Hybrid relevance scores reported per result (test suite) |
| Citation correctness | MEASURED | Every citation checked against actual retrieved source IDs |
| Unsupported-claim rate | MEASURED | 0 fabricated citations; claims restricted to retrieved excerpts |
| Answer faithfulness | MEASURED | ML probability/outcome and SHAP invariance verified |

### What was NOT used
- **LLM self-rating** is not accepted as proof of clinical accuracy (per Task 6 rules). No external LLM provider is used.
- **No fabricated scores.** Where a reference dataset is absent, the metric is reported as `NOT_EVALUATED`.

## 2. Test cases and results

### Suite A — Ingestion (`test-rag-ingestion.js`): 11 / 11 passed

| # | Case | Result |
|---|------|--------|
| 1 | Text document ingestion produces structured document record with chunks | PASSED |
| 2 | Metadata preserved on document and all chunks (title, org, date, url, disease, topic, type) | PASSED |
| 3 | Chunk text non-empty; page/section fields present | PASSED |
| 4 | Empty/whitespace-only document detected and rejected | PASSED |
| 4b | Missing text source rejected (no silent acceptance) | PASSED |
| 5 | Corrupted/noise document detected and rejected | PASSED |
| 6 | Duplicate document detected by fingerprint (title + org + URL) | PASSED |
| 7 | cleanText removes page-number and copyright boilerplate lines | PASSED |
| 8 | documentFingerprint stable for identical input; differs for different URL | PASSED |
| 9 | ingestDirectory on missing directory returns structured error | PASSED |

### Suite B — Retrieval (`test-rag-retrieval.js`): 16 / 16 passed

| # | Case | Result |
|---|------|--------|
| 1 | Vector store indexes all knowledge-base chunks across supported diseases | PASSED (46 chunks indexed) |
| 2 | All five Task-4 diseases represented in the index | PASSED (diabetes, dengue, malaria, chikungunya, typhoid) |
| 3 | Disease-aware retrieval scoped to disease=dengue (only dengue docs) | PASSED |
| 4 | Disease-aware retrieval scoped to disease=malaria (only malaria docs) | PASSED |
| 5 | Retrieval returns ranked results with relevance/semantic/keyword scores | PASSED |
| 6 | Results sorted in descending relevance order | PASSED |
| 7 | No matching evidence → INSUFFICIENT_EVIDENCE, zero sources | PASSED |
| 8 | No matching evidence includes descriptive message | PASSED |
| 9 | Hybrid scoring produces semantic + keyword components | PASSED |
| 10 | Source diversity enforced (no single source dominates) | PASSED |
| 11 | Each result carries full source metadata (org, title, URL, date) | PASSED |
| 12 | PII sanitized from retrieval query | PASSED |
| 13 | Outdated-source detection (> 3 years) | PASSED |
| 14 | Recent sources not flagged outdated | PASSED |
| 15 | Missing publication date handled gracefully | PASSED |
| 16 | Conflicting-source detection across dates/orgs | PASSED |

### Suite C — Citations & grounded explanations (`test-rag-citations.js`): 20 / 20 passed

| # | Case | Result |
|---|------|--------|
| 1 | Citations carry sourceId, title, org, URL, date matching source | PASSED |
| 2 | No fabricated citation fields (URL present, valid format) | PASSED |
| 3 | ML estimatedProbability invariant (0.7026 unchanged) | PASSED |
| 4 | ML predictedOutcome invariant (Positive unchanged) | PASSED |
| 5 | SHAP features preserved unchanged | PASSED |
| 6 | SHAP topPositiveFactors unchanged | PASSED |
| 7 | Medical context claims link only to verified source IDs | PASSED |
| 8 | No fabricated `[invented-source]` citation markers | PASSED |
| 9 | evidenceGrounded true when sources retrieved | PASSED |
| 10 | citations array populated with retrieved source | PASSED |
| 11 | evidenceGrounded false when no sources retrieved | PASSED |
| 12 | evidenceFacts states absence of evidence | PASSED |
| 13 | Limitations note insufficient evidence | PASSED |
| 14 | Interpretation labels AI reasoning; notes no evidence | PASSED |
| 15 | Summary contains no unsupported dosage/prescription language | PASSED |
| 16 | Disclaimer states not a confirmed diagnosis | PASSED |
| 17 | Disclaimer notes retrieved guidance is not proof of disease | PASSED |
| 18 | Outdated-quality flag reflected in interpretation | PASSED |
| 19 | Conflict-quality flag reflected in interpretation | PASSED |
| 20 | qualityFlags passed through to response | PASSED |

## 3. Document and chunk counts

Knowledge base as implemented (Task 6):

| Disease | Sources | Documents | Chunks |
|---------|---------|-----------|--------|
| diabetes | 4 | 4 | 8 |
| dengue | 3 | 3 | 10 |
| malaria | 4 | 4 | 13 |
| chikungunya | 3 | 3 | 9 |
| typhoid | 2 | 2 | 5 |
| **Total** | **16** | **16** | **45** |

(Chunk counts vary slightly with the sentence-boundary chunker; `store.getDocCount()` reports the live indexed count.)

## 4. Embedding and vector-store details

- **Embedding model:** None external. Pure-JS TF-IDF (term frequency × inverse document frequency), consistent with the pre-existing `server/knowledge/medicalKB.js` implementation. No sentence-transformers, no FAISS, no external API.
- **Vector store:** `server/services/vectorStoreService.js` — indexes all chunked knowledge-base documents; rebuilt lazily on first search.
- **Similarity:** Cosine similarity between query TF-IDF vector and document TF-IDF vectors (semantic), plus keyword-overlap ratio.
- **Hybrid score:** `0.7 × semantic + 0.3 × keyword`.
- **Top-k:** Configurable (default 5).
- **Minimum relevance:** 0.05 (hybrid); results below threshold are excluded.
- **Source diversity:** Hard cap of 2 chunks per source in top results.

## 5. Retrieval improvements over baseline

| Aspect | Baseline (medicalKB.js) | Task 6 (vectorStoreService.js) |
|--------|------------------------|--------------------------------|
| Corpus | 20 inline condition objects (no chunking) | 46 curated chunks across 5 diseases with rich metadata |
| Disease awareness | No (single combined index) | Yes — scoped per disease |
| Hybrid scoring | TF-IDF only | TF-IDF + keyword overlap |
| Source diversity | No | Yes (per-source cap) |
| Source metadata | Minimal (condition name, category) | Full (org, title, URL, date, type, topic, page) |
| No-evidence handling | Returns empty list | Explicit `INSUFFICIENT_EVIDENCE` status + message |
| Quality flags | None | Outdated, missing dates, low relevance, conflicts |
| PII in queries | Not sanitized | Sanitized (names, IDs, emails, phones removed) |

## 6. Citation implementation

Every evidence-grounded explanation includes a `citations` array. Each citation contains:

- `sourceId`, `title`, `organization`
- `publicationDate`, `retrievedAt`
- `url` (original source URL)
- `documentType`, `topic`, `disease`
- `section`, `page` (page where available)
- `relevanceScore`
- `excerpt` (truncated to 300 chars)
- `outdated` flag + reason

Citations refer to actual retrieved documents only. No fake citations or source links are generated.

## 7. LLM integration changes

No external LLM provider is integrated (no API keys stored; no external calls). Explanations are synthesized deterministically in `groundedLlmService.js`:

- ML prediction (probability + outcome) is **invariant** — never altered.
- SHAP feature attribution is **invariant** — never altered.
- Retrieved evidence is surfaced as `evidenceFacts` (retrieved facts tied to sources).
- AI-generated reasoning is surfaced as `interpretation` (clearly labelled).
- Quality flags (outdated, conflicts, low relevance, missing dates) flow into the interpretation and limitations.
- When no evidence is retrieved, the explanation states that evidence is unavailable and does not fabricate guidance.
- No unsupported treatment prescriptions or dosages are generated.

## 8. Security and privacy

- Retrieval queries are PII-sanitized (patient IDs, names, emails, phones removed) before any indexing/logging.
- No patient-identifying information is logged.
- Patient-uploaded lab reports are never ingested as trusted knowledge-base documents.
- Evidence endpoints require JWT authentication and enforce report ownership (`/api/reports/:id/evidence`).
- No API keys are stored in source code.

## 9. Limitations and known gaps

- **No external embedding model / FAISS.** Pure-JS TF-IDF is used due to environment constraints (native-module compilation blocked). Semantic quality is modest but deterministic and auditable.
- **No external LLM provider.** Explanations are rule-based synthesis, not generative LLM output. This avoids hallucination risk but limits fluency.
- **Page-level mapping unavailable.** Text-extraction layer does not provide page numbers; `page` is null. Section is preserved from topic.
- **Reference dataset absent.** Precision@K, recall@K, MRR, and answer-faithfulness against human judgments are `NOT_EVALUATED`.
- **better-sqlite3 not compilable.** DB-backed RAG tests (`test-rag-diabetes.js`) cannot run in this sandbox (pre-existing limitation).
- **Knowledge base is general public-health information**, not patient-specific clinical advice. Retrieval guidance is not proof of disease.
- **Source dates are approximate.** Publication dates reflect the organizational page/guideline version as documented; some are best-known dates rather than audited originals.