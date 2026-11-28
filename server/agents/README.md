# 🤖 Agentic AI Orchestration Layer (Task 7)

The Agentic AI Orchestration Layer coordinates all Task 1–6 components into a unified, traceable clinical workflow. It implements allowlisted tool execution, workflow planning, state management, safe failure recovery, inter-agent coordination, and clinical safety rules.

## Overview

The orchestrator receives patient input (symptoms text and/or lab report file), plans a tool execution workflow based on the scenario, executes tools sequentially with timeout/retry handling, enforces a mandatory patient verification gate, and produces a final evidence-grounded assessment report.

**Core design principles:**
- **Allowlisted tool registry** — only pre-registered tools can execute; no dynamic code loading
- **Input/output schemas with validation** — every tool declares and enforces its schema
- **Execution status tracking** — every tool run records status (COMPLETED/FAILED/SKIPPED/UNAVAILABLE/AWAITING_VERIFICATION), duration, retry count, and error messages
- **State machine** — CREATED → INPUT_RECEIVED → PROCESSING → AWAITING_VERIFICATION → VERIFIED → ANALYZING → EVIDENCE_RETRIEVAL → COMPLETED / PARTIALLY_COMPLETED / FAILED
- **Mandatory verification gate** — no disease prediction runs until the patient confirms extracted symptoms
- **ML invariants protected** — ML probability, outcome, and SHAP values are never modified by LLM/RAG output
- **No unvalidated models** — gated models (e.g. dengue) never run without readiness clearance
- **Execution trace persistence** — all tool executions persisted to SQLite via `workflowStore.js`

## File Structure

```
server/agents/
├── README.md                      # This file
├── orchestratorService.js         # Tool registry, workflow planning, execution engine, runWorkflow
├── workflowStore.js               # Persistence bridge: assessment state + execution traces → SQLite
└── tools/                         # 9 tool wrapper modules
    ├── symptom_analysis_tool.js   # Multilingual NLP symptom extraction (Task 5)
    ├── lab_report_analysis_tool.js # OCR lab report parsing + canonical mapping (Task 4)
    ├── data_verification_tool.js  # Mandatory patient verification gate
    ├── disease_readiness_tool.js  # Disease-model readiness checking (Task 4)
    ├── disease_prediction_tool.js # ML inference (Task 3)
    ├── shap_explanation_tool.js   # SHAP explainability extraction (Task 3)
    ├── medical_evidence_tool.js   # RAG medical evidence retrieval (Task 6)
    ├── risk_assessment_tool.js    # Clinical risk assessment (Task 6)
    └── report_generation_tool.js  # Final evidence-grounded assessment report (Task 6)
```

## API Endpoints

All endpoints are authenticated and enforce ownership (patients can only access their own assessments).

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/orchestrator/assessments` | `POST` | Start a new agentic assessment |
| `/api/orchestrator/assessments` | `GET` | List assessments for the authenticated user |
| `/api/orchestrator/assessments/:id` | `GET` | Get a single assessment with tool executions |
| `/api/orchestrator/assessments/:id/verify` | `POST` | Submit patient verification to resume a paused assessment |
| `/api/orchestrator/tools` | `GET` | List all registered orchestrator tools with schemas |

### POST /api/orchestrator/assessments

Request body:
```json
{
  "scenario": "symptoms_only",      // symptoms_only | lab_report_only | combined
  "disease": "diabetes",            // diabetes | dengue | malaria | chikungunya | typhoid
  "text": "fever and headache for 3 days",  // symptom description
  "language": "en",
  "userConfirmed": false,           // set true after verification gate
  "verifiedSymptoms": [],
  "labFilePath": "/uploads/report.pdf",     // required for lab_report_only / combined
  "mimeType": "application/pdf"
}
```

Response:
```json
{
  "success": true,
  "assessmentId": "assess-123",
  "status": "INPUT_RECEIVED",
  "scenario": "symptoms_only",
  "message": "Assessment created. Awaiting input processing."
}
```

## Workflow States

| State | Meaning |
|-------|---------|
| `CREATED` | Assessment record created |
| `INPUT_RECEIVED` | Patient input (symptoms/lab) received |
| `PROCESSING` | Tools actively executing |
| `AWAITING_VERIFICATION` | Paused at verification gate — needs patient confirmation |
| `VERIFIED` | Patient confirmed symptoms; workflow resumes |
| `ANALYZING` | Disease prediction + SHAP executing |
| `EVIDENCE_RETRIEVAL` | RAG medical evidence retrieval executing |
| `COMPLETED` | All tools finished successfully |
| `PARTIALLY_COMPLETED` | Some tools succeeded, some failed/skipped |
| `FAILED` | No tools completed successfully |

## Tool Contracts

Each tool exports:
- `name` — unique tool identifier
- `inputSchema` — `{ required: string[], properties: {...} }`
- `outputSchema` — declared output shape
- `validateInput(input)` — returns `string[]` of validation errors (empty = valid)
- `execute(input, { startedAt })` — returns `{ status, ..., inputValid, durationMs, error?: string }`

Execution statuses:
- `COMPLETED` — tool ran successfully
- `FAILED` — tool returned an error or threw
- `SKIPPED` — tool was skipped by workflow planner
- `UNAVAILABLE` — tool cannot run (e.g. missing SHAP data, gated model)
- `AWAITING_VERIFICATION` — verification gate (data_verification_tool only)
- `RISK_ASSESSMENT_UNAVAILABLE` — risk tool has no data to compute risk
- `MODEL_GATED` — disease model is gated/not ready
- `MODEL_UNAVAILABLE` — unknown or unsupported disease model
- `INSUFFICIENT_DATA` — not enough features for model readiness
- `INSUFFICIENT_EVIDENCE` — RAG found no matching sources

## Clinical Safety Rules

1. **Verification gate is mandatory** — `data_verification_tool` returns `AWAITING_VERIFICATION` until `userConfirmed === true`. No downstream prediction tool runs before verification.
2. **ML invariants are immutable** — `report_generation_tool` preserves `estimatedProbability`, `displayProbabilityPct`, and `predictedOutcome` exactly as produced by the ML model. RAG/LLM output cannot alter them.
3. **AI output is never presented as diagnosis** — report interpretations are prefixed with "AI interpretation:" and include safety disclaimers.
4. **No unvalidated disease models** — `disease_readiness_tool` returns `MODEL_GATED` for gated diseases (e.g. dengue per Task 4) and `MODEL_UNAVAILABLE` for unknown diseases. Gated models never execute.
5. **Risk assessment degrades gracefully** — returns `RISK_ASSESSMENT_UNAVAILABLE` when no prediction or lab data exists, rather than fabricating a risk score.
6. **No fabricated evidence** — `medical_evidence_tool` returns `INSUFFICIENT_EVIDENCE` with zero sources when nothing matches; `report_generation_tool` sets `evidenceGrounded: false`.

## Test Suite

`server/tests/test-agent-orchestrator.js` — 50 test assertions covering:

1. Tool registry & schemas (5 tests)
2. Symptom analysis tool extraction & validation (6 tests)
3. Data verification tool mandatory gate (5 tests)
4. Disease readiness tool model gating (4 tests)
5. Medical evidence tool RAG retrieval (4 tests)
6. Risk assessment tool (3 tests)
7. Report generation tool ML invariants & citations (5 tests)
8. SHAP explanation tool (3 tests)
9. Workflow planning & state machine (8 tests)
10. Tool execution failure handling (3 tests)
11. Safety rules: ML invariants, verification gate, gated models (5 tests)

Run with: `node server/tests/test-agent-orchestrator.js`

**Note:** Runtime integration tests (end-to-end via HTTP) require the SQLite `better-sqlite3` native module, which cannot compile in this environment. All tool-level logic tests pass without a database.

## Integration

- Frontend: `client/src/pages/app/AgentWorkflowPage.jsx` — workflow visualization with status pills, progress bar, verification gate UI
- Frontend API: `client/src/services/api.js` — `orchestratorService` methods (`startAssessment`, `getAssessment`, `listAssessments`, `verifyAssessment`, `listTools`)
- Backend routes: `server/routes/orchestrator.js` — authenticated, ownership-enforced REST endpoints
- Persistence: `server/db/database.js` — `assessments` + `assessment_tool_executions` tables with CRUD functions

## Limitations

- `better-sqlite3` native module cannot compile in this sandbox; runtime database integration tests are blocked
- PDF parsing (`pdf-parse`) and OCR (`tesseract.js`) use pure-JS shims in this environment
- File upload endpoint (`/api/reports/upload`) must be used to stage lab reports before passing `labFilePath` to the orchestrator
