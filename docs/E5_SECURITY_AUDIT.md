# Enhancement E5 — Security Audit

## Initial Security Audit Table

| # | Vulnerability | File path | Severity | Evidence | Root cause |
|---|---------------|-----------|----------|----------|------------|
| 1 | Hardcoded default doctor account with predictable password | `server/db/database.js` | Critical | `seedData()` creates `DOC-001` / `pavan@mediagent.com` / `MediAgent@2026!Secure` unconditionally when `doctors` table is empty | Default credentials seeded into production databases; no environment gating |
| 2 | No role-based access control enforcement | `server/middleware/auth.js` | High | `authenticateToken` verifies JWT but never checks `role`; role-based checks are inline and inconsistent (`isAdmin` in backup.js only) | Authorization is decentralized; no centralized RBAC middleware |
| 3 | JWTs are stateless with no revocation | `server/middleware/auth.js`, `server/db/database.js` | High | `revokeToken()` is a no-op; `sessions` table exists but unused; no token blacklist | Compromised tokens remain valid until expiry |
| 4 | Bearer tokens stored in browser localStorage | `client/src/services/api.js` | High | `getAuthToken()` reads `localStorage.getItem('mediagent_token')`; tokens accessible to any JavaScript on the page | XSS vulnerability leads to full account takeover |
| 5 | No CSRF protection | `server/index.js`, `client/src/services/api.js` | Medium | State-changing endpoints accept bearer tokens with no request-origin binding; CORS allows credentials | Cross-site request forgery possible if token is exfiltrated or browser auto-sends credentials |
| 6 | Uploaded files served publicly via static middleware | `server/index.js` | Medium | `app.use('/uploads', express.static(path.join(__dirname, 'uploads')))` — any file in uploads is directly accessible by URL | No authorization check on direct file access; path traversal possible via filename |
| 7 | No request schema validation library | All route files | Medium | Manual validation spread across routes; inconsistent field whitelisting | Mass-assignment possible; unexpected fields accepted |
| 8 | No account lockout / brute-force protection beyond rate limiting | `server/index.js`, `server/routes/auth.js` | Medium | Rate limiting exists (20 req/15min per IP) but no per-account lockout or failed-attempt tracking | Credential stuffing / brute-force against specific accounts |
| 9 | Password complexity only minimum length 8 | `server/routes/auth.js` | Medium | Registration checks `password.length < 8` only; no uppercase/digit/symbol requirements | Weak passwords acceptable |
| 10 | Error messages may expose internal paths | `server/routes/reports.js`, `server/routes/ml.js` | Low | `catch` blocks return `err.message` which can include file paths | Information disclosure aids further attacks |
| 11 | No SQL injection regression tests | `server/tests/test-security.js` | Low | Security tests are static analysis only; no parameterized-query verification | SQL injection regressions undetected |
| 12 | No prompt injection regression tests | None | Low | RAG retrieval accepts arbitrary query text without adversarial testing | Prompt injection could manipulate evidence retrieval |
| 13 | No secret scanning in CI | `.github/workflows/test.yml` | Low | CI workflow runs tests but no dependency scanning or secret scanning | Vulnerable dependencies and exposed secrets undetected |
| 14 | No content sanitization for rendered user content | Frontend components | Low | OCR text, patient symptoms, physician comments rendered without sanitization | Stored/reflected XSS possible |
| 15 | No SSRF protection | `server/routes/ml.js`, `server/routes/rag.js` | Low | External URL fetching not audited for private-network restriction | SSRF via dataset/model downloads or RAG ingestion |
| 16 | No data retention/deletion policy | None | Low | No retention schedules for reports, audio, transcripts, audit logs | Indefinite data retention |
| 17 | `.env` not in `.gitignore` explicitly | `.gitignore` | Low | `.env` is listed in `.gitignore` but `.env.example` contains placeholder secrets | Accidental secret commits possible |

## Corrections Implemented (E5)

See `docs/THREAT_MODEL.md`, `docs/AUTHENTICATION_SECURITY.md`, `docs/ROLE_BASED_ACCESS_CONTROL.md`, `docs/API_SECURITY.md`, `docs/PATIENT_PRIVACY.md`, `docs/DATA_RETENTION_POLICY.md`, `docs/DATABASE_ARCHITECTURE.md`, `docs/DATABASE_MIGRATIONS.md`, `docs/SECURE_DEPLOYMENT.md`, `docs/SECURITY_TEST_RESULTS.md`, and `SECURITY.md` for detailed documentation.
