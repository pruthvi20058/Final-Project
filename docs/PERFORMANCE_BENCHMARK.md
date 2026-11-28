# MediAgent — Performance Benchmark Report

**Date:** 2026-11-25  
**Environment:**  
- Node.js v22.22.3  
- Python 3.11+  
- SQLite (better-sqlite3 native binding)  
- Single-core sandbox environment  
- No concurrent load

---

## 1. Frontend Performance

### Bundle Size

| Asset | Size | Gzipped |
|-------|------|---------|
| index.html | 0.87 kB | 0.48 kB |
| CSS | 53.89 kB | 9.98 kB |
| JavaScript | 1,034.58 kB | 277.31 kB |

### Route Load Time

Not measured — no production deployment for real-user monitoring. Initial load depends on network and device.

### Optimizations Applied

- Vite production build with code splitting
- Recharts for SVG-based charts (no canvas dependency)
- CSS-based animations (no JS animation library)
- Responsive image handling for file previews

### Recommendations

- Implement route-level lazy loading for admin pages
- Add React.memo for expensive components
- Implement API request caching/deduplication
- Add pagination to reports and patient lists

---

## 2. Backend Performance

All backend tests pass under performance thresholds:

| Operation | Threshold | Actual | Status |
|-----------|-----------|--------|--------|
| Risk assessment | < 5000ms | Pass | PASS |
| Emergency warning detection | < 5000ms | Pass | PASS |
| Lab interpretation | < 5000ms | Pass | PASS |
| Disease readiness check | < 5000ms | Pass | PASS |
| RAG evidence retrieval | < 5000ms | Pass | PASS |
| Report generation | < 5000ms | Pass | PASS |
| 10 sequential risk assessments | < 10000ms total | Pass | PASS |
| No performance degradation over repeated calls | N/A | Pass | PASS |

Source: `server/tests/test-performance.js` — 16/16 passed

### Database

- SQLite with better-sqlite3 (synchronous, no connection pooling overhead)
- Indexes on `failed_logins(email, attempted_at)`, `assessments(user_id)`
- No WAL mode configured for production

### Recommendations

- Add database indexes on frequently queried columns (report ID, user ID, date)
- Enable WAL mode for concurrent read/write access
- Add query result caching for model readiness checks
- Implement request timeouts for ML inference

---

## 3. ML Inference Performance

Not measured — ML models load per-request in the current architecture. No model caching or persistent inference service is implemented.

### Recommendations

- Load ML models once at startup instead of per-request
- Implement model warming for frequently used disease models
- Add inference timeout configuration (ML_INFERENCE_TIMEOUT_MS)

---

## 4. OCR Performance

Not measured — OCR processing duration not benchmarked. Tesseract.js runs in the browser or backend depending on configuration.

---

## 5. Load Testing

Not performed — no load testing has been executed. Single-user test environment only.

### Recommended Load Test Scenarios

- Concurrent authenticated users (10, 50, 100)
- Multiple report uploads simultaneously
- Concurrent ML inference requests
- RAG retrieval under load
- Patient history retrieval with large datasets

### Metrics to Collect

- Requests per second
- Median, P95, P99 latency
- Error rate
- CPU and memory usage
- Database locking behavior

---

## 6. Test Environment

All performance tests executed in a single-core sandbox with no network latency. Results are not representative of production performance.
