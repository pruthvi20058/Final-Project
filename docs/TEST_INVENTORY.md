# MediAgent Test Inventory — Task 9

Generated: 2026-11-25
Branch: arena/370e8461-final-project

This document inventories all existing and newly created tests, what they cover,
what is missing, and what cannot currently be tested in this sandbox environment.

## 1. Existing Test Suites (pre-Task 9)

| File | Type | Coverage | Status | Notes |
|------|------|----------|--------|-------|
| `server/tests/test-agent-orchestrator.js` | Unit | Task 7 agentic orchestration tools, workflow planning, safety rules | ✅ 50/50 PASS | Pure function tests, no DB/server needed |
| `server/tests/test-risk-engine.js` | Unit | Task 8 clinical risk, emergency warnings, ML independence | ✅ 20/20 PASS | Pure function tests, no DB/server needed |
| `server/tests/test-pipeline.js` | Integration | HTTP backend routes (requires running server on port 3001) | ⚠️ PARTIAL | Requires server runtime; some tests fail (Python ML not available) |
| `server/tests/test-ml-legitimate.js` | Unit | ML dataset files, schema, model artifacts exist | ✅ 8/12 PASS | 4 fail due to missing Python/pandas |
| `server/tests/test-model-readiness-integration.js` | Unit | Disease model readiness checking | Unknown | Not yet executed in this session |
| `server/tests/test-multidisease-ml.js` | Unit | Multi-disease ML inference | Unknown | Not yet executed in this session |
| `server/tests/test-multilingual-nlp.js` | Unit | Multilingual NLP processing | Unknown | Not yet executed in this session |
| `server/tests/test-rag-citations.js` | Unit | RAG citation correctness | Unknown | Not yet executed in this session |
| `server/tests/test-rag-diabetes.js` | Unit | RAG diabetes evidence | Unknown | Not yet executed in this session |
| `server/tests/test-rag-ingestion.js` | Unit | RAG ingestion pipeline | Unknown | Not yet executed in this session |
| `server/tests/test-rag-retrieval.js` | Unit | RAG retrieval relevance | Unknown | Not yet executed in this session |
| `server/tests/test-health-companion.js` | Unit | Health companion agents, DB seed data | Unknown | Not yet executed in this session |
| `server/tests/test-chikungunya-report-flow.js` | Integration | Chikungunya report flow | Unknown | Not yet executed in this session |
| `server/tests/test-disease-prediction-flow.js` | Integration | Disease prediction flow | Unknown | Not yet executed in this session |
| `server/tests/test-phase2-priority2.js` | Unit | Phase 2 priority 2 features | Unknown | Not yet executed in this session |
| `server/tests/test-phase3-extraction.js | Unit | Phase 3 extraction features | Unknown | Not yet executed in this session |
| `server/tests/test-scanned-pdf-demographics.js | Unit | Scanned PDF demographics extraction | Unknown | Not yet executed in this session |
| `server/tests/test-shap-diabetes.js | Unit | SHAP diabetes explainability | Unknown | Not yet executed in this session |
| `server/tests/test-table-extraction.js | Unit | Table extraction from lab reports | Unknown | Not yet executed in this session |

**Frontend tests:** None exist. No vitest/jest/react-testing-library configured in `client/package.json`.

## 2. Backend Route Coverage

| Route | Method | Auth | Existing Tests | Coverage Status |
|-------|--------|------|----------------|-----------------|
| `/api/auth/register` | POST | No | None | ❌ Not tested |
| `/api/auth/login` | POST | No | None | ❌ Not tested |
| `/api/auth/me` | GET | Yes | None | ❌ Not tested |
| `/api/reports/upload` | POST | Yes | None | ❌ Not tested |
| `/api/reports` | GET | Yes | None | ❌ Not tested |
| `/api/reports/:id` | GET | Yes | None | ❌ Not tested |
| `/api/reports/:id/extract` | POST | Yes | None | ❌ Not tested |
| `/api/reports/:id/validate` | POST | Yes | None | ❌ Not tested |
| `/api/reports/:id/prediction` | GET | Yes | None | ❌ Not tested |
| `/api/reports/:id/xai` | GET | Yes | None | ❌ Not tested |
| `/api/reports/:id/risk` | GET | Yes | None | ❌ Not tested |
| `/api/reports/:id/evidence` | GET | Yes | None | ❌ Not tested |
| `/api/patients` | GET | Yes | None | ❌ Not tested |
| `/api/consultations` | GET/POST | Yes | None | ❌ Not tested |
| `/api/knowledge` | GET | Yes | None | ❌ Not tested |
| `/api/rag/*` | Various | Yes | Unit tests exist | ✅ Partially covered |
| `/api/ml/*` | Various | Yes | None | ❌ Not tested |
| `/api/nlp/*` | Various | Yes | Unit tests exist | ✅ Partially covered |
| `/api/health-companion/*` | Various | Yes | Unit tests exist | ✅ Partially covered |
| `/api/orchestrator/assessments` | POST/GET | Yes | Unit tests exist | ✅ Partially covered |
| `/api/orchestrator/assessments/:id/verify` | POST | Yes | Unit tests exist | ✅ Partially covered |
| `/api/orchestrator/tools` | GET | Yes | Unit tests exist | ✅ Partially covered |
| `/api/risk/assess` | POST | Yes | Unit tests exist | ✅ Partially covered |
| `/api/risk/assessments` | GET | Yes | Unit tests exist | ✅ Partially covered |
| `/api/risk/assessments/:id` | GET | Yes | Unit tests exist | ✅ Partially covered |
| `/api/risk/categories` | GET | Yes | Unit tests exist | ✅ Partially covered |
| `/api/risk/sources` | GET | Yes | Unit tests exist | ✅ Partially covered |
| `/api/risk/reference-ranges` | GET | Yes | Unit tests exist | ✅ Partially covered |
| `/api/risk/rules` | GET | Yes | Unit tests exist | ✅ Partially covered |

## 3. What Cannot Currently Be Tested (Environment Limitations)

| Capability | Blocker | Workaround |
|------------|---------|------------|
| Better-sqlite3 native module | Cannot compile (missing Python headers, network blocked) | Pure-JS shim created for unit tests |
| Python ML inference | pandas/scikit-learn not installed; python binary may not work | Static inspection only; ML service tests skipped |
| pdf-parse native module | Cannot compile | Pure-JS shim created |
| tesseract.js OCR | Native compilation | Pure-JS shim created |
| sharp image processing | Native compilation | Pure-JS shim created |
| Canvas | Native compilation | Pure-JS shim created |
| Frontend React component tests | No test runner configured (no vitest/jest) | Source inspection only; no runtime frontend tests |
| HTTP integration tests | Server requires better-sqlite3 native module | Cannot start real Express server |
| Concurrent/performance testing | No running server | Synthetic timing tests only |
| Voice/TTS | Python dependencies missing | Static inspection only |

## 4. New Test Suites Created (Task 9)

| File | Type | Coverage | Status |
|------|------|----------|--------|
| `server/tests/test-backend-comprehensive.js` | Integration (pure-function where possible) | Auth, routes, ownership, validation, error handling | To be created |
| `server/tests/test-e2e-workflows.js` | E2E | Scenarios A-F (symptoms-only, lab-only, combined, insufficient data, emergency, service failures) | To be created |
| `server/tests/test-security.js` | Security | Unauthorized access, cross-user access, invalid tokens, file upload restrictions, SQL injection | To be created |
| `server/tests/test-performance.js` | Performance | API response times, concurrent requests, bottlenecks | To be created |
| `docs/TESTING_AND_VALIDATION.md` | Documentation | Full test report | To be created |
| `docs/KNOWN_LIMITATIONS.md` | Documentation | Known limitations | To be created |

## 5. ML Model Validation Status

| Disease | Status | Metrics Trustworthy? | Action |
|---------|--------|---------------------|--------|
| Diabetes | VERIFIED | Yes | None |
| Dengue | NEEDS_CLEANING | No (100% across all models) | Investigate leakage, retrain |
| Malaria | VERIFIED (low perf) | Yes | Document honest limitations |
| Chikungunya | NEEDS_CLEANING | No (duplicate rows) | Deduplicate, retrain |
| Typhoid | GUARDED/UNAVAILABLE | No (provenance unverified) | Keep gated |

## 6. CI Configuration

| File | Purpose | Status |
|------|---------|--------|
| `.github/workflows/deploy.yml` | Frontend deploy to GitHub Pages | Exists, builds client only |
| No CI test workflow exists | Backend tests, linting, etc. | Missing — to be created |
