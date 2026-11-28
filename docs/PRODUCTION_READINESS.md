# MediAgent Production Readiness

This document describes the production-readiness measures implemented in Task 10.
MediAgent preserves the React/Express/SQLite/Python ML architecture from Tasks 1-8.

## Environment Configuration

### `.env.example`

The repository includes `.env.example` at the project root with all required
environment variables. Copy it to `.env` and fill in production values:

```
cp .env.example .env
```

### Startup Validation

The backend validates all required environment variables at startup via
`server/utils/envValidator.js`. If any required variable is missing or
insecure (e.g. JWT_SECRET is a placeholder), the server exits with code 1
and a clear error message. This prevents the server from starting with an
insecure or incomplete configuration.

### Secrets Management

- **JWT_SECRET**: Must be at least 16 characters and not a placeholder.
  Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
- **No hardcoded credentials**: All credentials come from environment variables.
- **No secrets in Git**: `.env` is excluded via `.gitignore`.
- **No patient data in logs**: The structured logger redacts emails, tokens,
  and other sensitive fields.

### CORS Configuration

CORS is restricted to permitted origins via `CORS_ORIGIN` environment variable.
In production, `CORS_ORIGIN` should be set to your frontend domain. Wildcard
(`*`) is only allowed in development.

## Backend Reliability

### Centralized Error Handling

A global error handler (`server/index.js`) catches all unhandled errors and
returns consistent JSON responses without exposing stack traces:

```json
{
  "success": false,
  "error": { "code": "SERVER_ERROR", "message": "Internal server error" },
  "correlationId": "req-abc123"
}
```

Multer upload errors are handled separately with specific error codes
(`FILE_TOO_LARGE`, `UPLOAD_ERROR`).

### Consistent API Response Format

All API responses follow this format:

```json
// Success
{ "success": true, "data": ..., "correlationId": "..." }

// Error
{ "success": false, "error": { "code": "...", "message": "..." }, "correlationId": "..." }
```

### Request Validation

- File uploads limited to 15 MB with file type filtering
- Request body limited to 50 MB
- JWT authentication on all protected routes
- Disease parameter validated against supported list

### Request Timeouts

A request timeout middleware (`server/index.js`) prevents hung requests from
holding connections. The timeout is configurable via `ML_INFERENCE_TIMEOUT_MS`
(default 30 seconds). Timeout responses include the correlation ID.

### Graceful Shutdown

The server handles SIGTERM (Render/Heroku) and SIGINT (Ctrl+C) by:
1. Stopping the HTTP server (no new connections)
2. Closing the SQLite database connection
3. Exiting with appropriate status code

Uncaught exceptions and unhandled rejections are logged and cause exit with
code 1.

### Database Connection Management

- SQLite with WAL mode for concurrent read/write access
- Single connection instance shared across the application
- Properly closed on shutdown
- `SELECT 1` health check for connectivity verification

### Safe Temp File Cleanup

Uploaded files are stored in `UPLOAD_DIR` and managed by multer. The backup
system (`server/utils/backup.js`) creates timestamped database backups in
`BACKUP_DIR`.

### Upload Restrictions

- Maximum file size: 15 MB for images
- Maximum dataset size: 100 MB for CSV/XLSX/JSON/ZIP
- File type filtering for uploads and datasets

### Structured Logging

JSON-formatted logs via `server/utils/logger.js`. Each log entry includes:
- Timestamp (ISO 8601)
- Log level (error/warn/info/debug)
- Message
- Service name
- Environment
- Correlation ID (when available)

PII is redacted: emails, tokens, authorization headers, cookies.

### Request Correlation IDs

Every request gets a correlation ID via `X-Correlation-ID` header:
- Client can supply one (max 128 chars)
- Server generates one if not provided
- ID is echoed back in response header
- ID is included in all log entries and error responses

## Python ML Service Reliability

### Model Availability Checks

Models are gated by the model registry (`server/ml/models/model_registry.json`).
Inference is blocked for:
- Diseases with no registry entry
- Diseases with status other than TRAINED/AVAILABLE
- Models without evaluation metrics
- Missing model artifacts

### Feature Schema Validation

Strict feature validation via `server/ml/common/feature_validator.py`:
- Validates required features are present
- Checks values against valid ranges
- Identifies invalid/suspicious features
- Returns `INSUFFICIENT_DATA` or `INVALID_DATA` status without prediction

### Model Version Tracking

Each model in the registry includes:
- `model_version` (e.g. `v2.0.0-pima-diabetes`)
- `algorithm`
- `metrics` (accuracy, precision, recall, etc.)
- `dataset_provenance`
- `updated_at`

### Inference Timeout Handling

Python ML inference runs with a 7-second timeout. On timeout:
- The Python process is killed
- The backend falls back to the authoritative JavaScript inference engine
- No fake predictions are generated

### Missing Dependency Detection

Health checks verify Python executable availability. Missing dependencies
are reported as `UNAVAILABLE` in health endpoints, not silently ignored.

### Invalid Prediction Output Handling

All prediction outputs are validated before being returned to the client.
Invalid or error responses from Python are caught and translated to
appropriate API errors. No random or fabricated predictions are ever served.

### Model Loading Optimization

Model artifacts are loaded once per inference call. The diabetes model uses
an authoritative JavaScript implementation for fast inference (2ms execution
time) without requiring Python.

### Consistent Error Responses

ML service errors follow the same format as other API errors:
```json
{
  "status": "MODEL_NOT_AVAILABLE",
  "disease": "typhoid",
  "message": "ML prediction for Typhoid is currently unavailable.",
  "readiness": "UNAVAILABLE"
}
```

## Health Monitoring Endpoints

### GET /api/health

Overall health status. Checks:
- Backend (Express API)
- Database (SQLite connection)

Returns `HEALTHY` or `DEGRADED`.

### GET /api/health/ready

Readiness probe for orchestrators. Checks:
- Database connection
- Python executable
- Model artifacts

Returns 200 (READY) or 503 (NOT_READY).

### GET /api/health/models

ML model availability and version tracking. Lists all 5 diseases with:
- Status (TRAINED/NOT_TRAINED)
- Readiness status
- Model version
- Artifact presence
- Metrics

## Database Reliability & Privacy

### Schema Initialization

Database schema is initialized at startup via `server/db/database.js` with
`CREATE TABLE IF NOT EXISTS` for all tables.

### Transaction Handling

SQLite transactions are used for multi-statement operations. WAL mode
provides concurrent access.

### Foreign Key Enforcement

Foreign keys are defined in the schema (e.g. `patients.created_by` references
`doctors.id`).

### Indexes

Indexes are created on frequently queried columns for performance.

### Backup & Restore

Full backup/restore system via `server/utils/backup.js`:
- `createBackup()`: Timestamped SQLite backup
- `restoreFromBackup()`: Restore from backup file
- `listBackups()`: List available backups
- `enforceRetention()`: Delete backups older than retention period
- API endpoints under `/api/backup/` (admin only)

### Patient Access Restrictions

- All patient data routes require authentication
- Ownership enforcement: users can only access their own records
- `requireOwnership` middleware checks resource ownership

### Safe Deletion

Soft deletion patterns where appropriate. No cascading deletes that could
accidentally remove related records.

### Data Retention

Backup retention is configurable via `BACKUP_RETENTION_DAYS` (default 30 days).

### No PII in Logs/Errors/Monitoring

The structured logger redacts sensitive fields. Error responses never expose
patient data, stack traces, or internal details.

## Security

### Authentication

JWT-based authentication with:
- 24-hour token expiration (configurable)
- Secure token generation with `crypto.randomBytes`
- Token expiration and invalidity handling
- Session expiration messages for frontend

### Rate Limiting

- General API: 300 requests per 15 minutes per IP
- Auth endpoints: 20 attempts per 15 minutes per IP

### Security Headers

Helmet middleware sets:
- X-Frame-Options
- X-Content-Type-Options
- Content Security Policy
- And other security headers

### CORS

Restricted to specific origins via `CORS_ORIGIN`.

### File Upload Security

- File size limits
- File type filtering
- Filename sanitization via unique suffixes

## Frontend Production Readiness

See frontend-specific measures in the implementation. Key points:

- Error boundaries for React components
- Loading indicators for async operations
- API failure messages (no silent failures)
- Session expiration handling
- Connectivity indicators
- Responsive layouts
- Accessible forms
- Duplicate submission prevention
- Safe retry logic
- Model-unavailable messages
- No fabricated records when backend unavailable

## Docker Containerization

### Files

| File | Purpose |
|------|---------|
| `client/Dockerfile` | Frontend: build with Vite, serve with nginx |
| `server/Dockerfile` | Backend: Node + Python + Tesseract + build tools |
| `docker-compose.yml` | Multi-service orchestration |
| `.dockerignore` | Excludes node_modules, .env, logs, etc. |

### Build Verification

```bash
docker compose up --build
```

### Health Checks

Docker health check on backend: `GET /api/health/ready`

### Volumes

`mediagent_data` volume persists:
- SQLite database
- Uploaded files
- Backups

## CI/CD Integration

GitHub Actions workflow (`.github/workflows/test.yml`):
- Dependency installation
- Backend tests
- Frontend tests
- Python model validation
- Security tests
- Integration tests
- Production build verification
- Docker build verification

Deployment is blocked when mandatory tests fail.

## Known Limitations

See `docs/KNOWN_LIMITATIONS.md` for full details.

Key limitations:
- Typhoid model is NOT_TRAINED — no inference served
- better-sqlite3 is a native C++ module requiring compilation
- Python ML dependencies require system packages
- OCR accuracy depends on document quality
