# MediAgent Deployment Guide

This guide covers deploying MediAgent in development and production environments.
MediAgent preserves the React/Express/SQLite/Python ML architecture from Tasks 1-8.

## Architecture Overview

- **Frontend**: React + Vite, served by nginx in production
- **Backend**: Express.js + Node.js, SQLite database
- **ML Service**: Python 3 + scikit-learn + joblib + SHAP (runs as child processes from backend)
- **OCR**: Tesseract.js (frontend) + pdf-parse (backend)
- **RAG**: Curated medical knowledge base (JSON files)

## Prerequisites

| Component | Version | Notes |
|-----------|---------|-------|
| Node.js | 18+ | Required for backend and frontend build |
| Python | 3.9+ | Required for ML inference |
| SQLite | Built-in | Via better-sqlite3 native module |
| Docker | 24+ | Optional, for containerized deployment |
| Docker Compose | 2.20+ | Optional, for containerized deployment |

## Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `JWT_SECRET` | Secret for signing JWT tokens (min 16 chars, not a placeholder) | `your-256-bit-secret` |
| `CORS_ORIGIN` | Comma-separated list of allowed frontend origins | `https://your-app.vercel.app` |
| `PORT` | Backend server port | `3001` |
| `DATABASE_PATH` | Path to SQLite database file | `server/mediagent.db` |
| `UPLOAD_DIR` | Directory for uploaded files | `server/uploads` |
| `PYTHON_EXECUTABLE` | Path to Python executable | `python3` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Node environment | `development` |
| `JWT_EXPIRES_IN` | JWT token expiration | `24h` |
| `TRANSLATION_PROVIDER` | Translation service | `mymemory` |
| `MYMEMORY_EMAIL` | MyMemory API contact email | (none) |
| `ML_INFERENCE_TIMEOUT_MS` | ML inference timeout in ms | `7000` |
| `LOG_LEVEL` | Log level (error/warn/info/debug/silent) | `info` |
| `BACKUP_DIR` | Backup directory | `server/backups` |
| `BACKUP_RETENTION_DAYS` | Backup retention in days | `30` |

## Deployment Options

### 1. Docker Compose (Recommended for Production)

```bash
# Copy environment file
cp .env.example .env
# Edit .env with your production values (JWT_SECRET, CORS_ORIGIN, etc.)

# Build and start
docker compose up --build

# Run in detached mode
docker compose up -d

# View logs
docker compose logs -f

# Stop
docker compose down
```

**Services:**
- `backend` (port 3001): Express API, SQLite, Python ML
- `frontend` (port 80): React app served by nginx

**Volumes:**
- `mediagent_data`: Persists SQLite DB, uploads, and backups

**Health Checks:**
- Backend: `GET /api/health/ready` every 30s
- Frontend: No health check (served by nginx)

### 2. Render (Backend)

The `render.yaml` file configures the backend service:

```yaml
services:
  - type: web
    name: mediagent-backend
    env: node
    buildCommand: npm install
    startCommand: node server/index.js
    envVars:
      - key: NODE_ENV
        value: production
      - key: JWT_SECRET
        generateValue: true
      - key: CORS_ORIGIN
        value: https://your-frontend.onrender.com
```

**Limitations on Render:**
- Persistent disk: Available via Render Disk (mount at `/data`)
- Python inference: Available (Python 3 in build environment)
- OCR deps: Tesseract must be installed via build command
- Resources: Depends on plan (starter tier may be insufficient for ML)

### 3. Vercel (Frontend)

The `vercel.json` file configures the frontend:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "client/dist",
  "framework": "vite"
}
```

Set `VITE_API_URL` in Vercel Dashboard to your backend URL (e.g. `https://mediagent-backend.onrender.com`).

### 4. Local Development

```bash
# Install root dependencies
npm install

# Install server dependencies
cd server && npm install && cd ..

# Install client dependencies
cd client && npm install && cd ..

# Copy environment file
cp .env.example .env

# Start development (runs both backend and frontend)
npm run dev

# Or start separately
# Terminal 1: cd server && node index.js
# Terminal 2: cd client && npm run dev
```

Backend: http://localhost:3001
Frontend: http://localhost:5173

## Platform Capabilities & Limitations

| Platform | Persistent Storage | Python Inference | OCR Deps | SHAP Deps | Notes |
|----------|-------------------|------------------|----------|-----------|-------|
| Docker Compose | Yes (volume) | Yes | Yes (apt) | Yes (pip) | Full control |
| Render | Yes (disk) | Yes | Partial | Partial | Build command needed |
| Vercel | No | No | No | No | Frontend only |

## Cost Estimates

| Platform | Tier | Estimated Cost | Notes |
|----------|------|----------------|-------|
| Docker (self-hosted) | VPS | $5-20/mo | Depends on provider |
| Render | Starter | Free | Limited resources |
| Render | Standard | $7/mo | Better for ML workloads |
| Vercel | Hobby | Free | Frontend only |

## Verification Checklist

Before deploying to production:

- [ ] `JWT_SECRET` is a strong random value (not the placeholder)
- [ ] `CORS_ORIGIN` is set to your production frontend URL
- [ ] `.env` is not committed to version control
- [ ] `docker compose up --build` succeeds
- [ ] `GET /api/health` returns HEALTHY
- [ ] `GET /api/health/ready` returns READY
- [ ] `GET /api/health/models` shows model availability
- [ ] Database file persists across container restarts
- [ ] Backup and restore work correctly
- [ ] Graceful shutdown works (SIGTERM handled)
