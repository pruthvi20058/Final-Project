# Enhancement E5 — Threat Model

## Assets

| Asset | Description | Sensitivity |
|-------|-------------|-------------|
| Patient records | Demographics, medical history, medications | Critical |
| Laboratory reports | Uploaded PDFs/images, OCR text, lab values | Critical |
| Audio recordings | Voice symptom recordings | Critical |
| Transcriptions | Speech-to-text output | Critical |
| Disease predictions | ML model outputs, probabilities | High |
| Clinical risk assessments | Rule-based risk categorization | High |
| Physician reviews | Clinical sign-offs, observations | High |
| Authentication credentials | JWTs, bcrypt password hashes | Critical |
| Model artifacts | Serialized sklearn models (joblib) | High |
| Medical knowledge base | RAG sources, clinical guidelines | Medium |
| Database backups | SQLite dumps, uploaded files | Critical |
| API credentials | External service keys | Critical |

## Trust Boundaries

1. **Browser ↔ Frontend (Vite/React)** — Client-side token storage in localStorage; XSS boundary.
2. **Frontend ↔ Backend (Express)** — Bearer JWT over HTTPS; CORS boundary.
3. **Backend ↔ SQLite** — Parameterized queries; database file on disk.
4. **Backend ↔ Python ML** — `child_process.spawn` with validated script paths; stdin/stdout JSON.
5. **Backend ↔ External services** — Translation, RAG sources; network boundary.
6. **Backend ↔ Uploaded files** — Disk storage in `server/uploads/`.

## Threat Scenarios

| ID | Threat | Asset | Likelihood | Impact | Risk | Existing Controls | Residual Risk |
|----|--------|-------|------------|--------|------|-------------------|---------------|
| T1 | Unauthorized user accesses another patient's report | Patient records, lab reports | Medium | Critical | Critical | Ownership checks on all report endpoints | Low |
| T2 | User accesses another user's assessment | Assessments, risk assessments | Medium | High | High | User-scoped queries (`WHERE user_id = ?`) | Low |
| T3 | Compromised JWT token used after credential change | Authentication | High | Critical | Critical | Token expiry (24h); no revocation | High |
| T4 | Malicious uploaded document (PDF bomb, XSS in OCR text) | Lab reports | Medium | High | High | File type/size limits; OCR text not executed | Medium |
| T5 | Prompt injection via RAG / OCR text | Medical knowledge base | Medium | High | High | Query sanitization (PII removal) | Medium |
| T6 | Unauthorized physician review approval | Physician reviews | Low | High | High | Role-based endpoint checks | Low |
| T7 | Database corruption / accidental deletion | All data | Low | Critical | Critical | WAL mode; backup/restore | Medium |
| T8 | External service failure (translation, RAG) | Availability | High | Medium | Medium | Graceful degradation; unavailable status | Low |
| T9 | Excessive resource consumption (DoS) | Availability | Medium | High | High | Rate limiting; request timeouts | Medium |
| T10 | Default/demo account access in production | Authentication | Medium | Critical | Critical | None (currently unconditional seed) | Critical |
| T11 | SQL injection via route parameters | All data | Low | Critical | Critical | Parameterized queries (better-sqlite3) | Low |
| T12 | Path traversal via uploaded filenames | File system | Low | High | High | UUID-generated filenames; extension allowlist | Low |
| T13 | XSS via rendered user content | Frontend sessions | Medium | High | High | None (no output sanitization) | High |
| T14 | SSRF via external URL fetching | Internal infrastructure | Low | High | High | None | Medium |
| T15 | Model artifact tampering / untrusted model load | Model artifacts | Low | Critical | Critical | Read-only artifacts; no upload endpoint for models | Low |

## Prioritized Corrections

1. **Critical**: Gate default/demo account behind `DEMO_MODE` environment variable (T10)
2. **High**: Implement JWT token revocation / blacklist (T3)
3. **High**: Add centralized RBAC middleware (T1, T2)
4. **High**: Add XSS output sanitization on frontend (T13)
5. **Medium**: Serve uploaded files through authorized endpoint, not static middleware (T4, T12)
6. **Medium**: Add prompt injection regression tests (T5)
7. **Medium**: Add SSRF protection for external URL fetching (T14)
8. **Medium**: Add secret scanning to CI (T10-related)
9. **Medium**: Add password complexity + account lockout (T10-related)
10. **Low**: Add SQL injection regression tests (T11)

## Security Controls Inventory

| Control | Implementation | Status |
|---------|---------------|--------|
| Authentication | JWT + bcrypt (salt 12) | Implemented |
| Authorization | Inline ownership checks; no RBAC middleware | Partial |
| Transport security | Helmet headers; CORS; HTTPS via deployment | Implemented |
| Rate limiting | express-rate-limit (global + auth) | Implemented |
| Input validation | Manual validation on most routes | Partial |
| SQL injection prevention | Parameterized queries (better-sqlite3) | Implemented |
| File upload security | Extension/size limits; UUID filenames | Partial |
| Audit logging | `audit_logs` table; structured logger | Implemented |
| Token revocation | None (stateless JWT) | Missing |
| Session management | `sessions` table exists but unused | Missing |
| XSS prevention | None | Missing |
| SSRF protection | None | Missing |
| Secret scanning | None | Missing |
| Data retention | None | Missing |
| Backup/restore | Implemented (`server/utils/backup.js`) | Implemented |
